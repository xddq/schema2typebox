import $Refparser from "@apidevtools/json-schema-ref-parser";
import camelcase from "camelcase";
import { isBoolean } from "fp-ts/lib/boolean";
import { isNumber } from "fp-ts/lib/number";
import { isString } from "fp-ts/lib/string";
import {
  JSONSchema7,
  JSONSchema7Definition,
  JSONSchema7Type,
  JSONSchema7TypeName,
} from "json-schema";
import { RecursionTargets, findRecursionTargets } from "./recursion";
import {
  AllOfSchema,
  AnyOfSchema,
  ArraySchema,
  ConstSchema,
  EnumSchema,
  MultipleTypesSchema,
  NotSchema,
  ObjectSchema,
  OneOfSchema,
  UnknownSchema,
  isAllOfSchema,
  isAnyOfSchema,
  isArraySchema,
  isConstSchema,
  isEnumSchema,
  isNotSchema,
  isNullType,
  isObjectSchema,
  isOneOfSchema,
  isSchemaWithMultipleTypes,
  isUnknownSchema,
} from "./schema-matchers";

type Code = string;

type RecursionState = {
  // object -> placeholder name ("This", "This1", ...) for each recursion target
  targets: RecursionTargets;
  // recursion targets whose Type.Recursive(...) is currently open on the path
  active: Set<object>;
  // ordered log of every back-edge emitted; parseOneOf slices it to detect
  // back-edges produced within its own members and pick OneOf vs Type.Union
  backEdges: object[];
};

// Module-level generation state, used as an implicit parameter threaded through
// the parse* call tree (collect/parseOneOf read it) instead of widening every
// parser signature. This is safe only because generation is synchronous: the
// state is assigned once per top-level schema2typebox() call and cleared in a
// finally before returning, with no await in between, so calls cannot interleave
// on it. It is left undefined for non-recursive schemas (and whenever parse*
// functions are called directly in unit tests), in which case collect/parseOneOf
// behave exactly as they did before recursion support.
let recursionState: RecursionState | undefined;

/** Generates TypeBox code from a given JSON schema */
export const schema2typebox = async (jsonSchema: string) => {
  const schemaObj = JSON.parse(jsonSchema);
  const dereferencedSchema = (await $Refparser.dereference(
    schemaObj
  )) as JSONSchema7Definition;

  const exportedName = createExportNameForSchema(dereferencedSchema);
  // Ensuring that generated typebox code will contain an '$id' field.
  // see: https://github.com/xddq/schema2typebox/issues/32
  if (
    typeof dereferencedSchema !== "boolean" &&
    dereferencedSchema.$id === undefined
  ) {
    dereferencedSchema.$id = exportedName;
  }

  // Detect self-referential nodes so we can emit Type.Recursive(...) for them
  // instead of infinitely inlining the dereferenced circular graph. See #62.
  // Only set up recursion state when the schema actually contains a cycle, so
  // non-recursive generation stays a true no-op identical to before.
  const recursionTargets = findRecursionTargets(dereferencedSchema);
  recursionState =
    recursionTargets.size > 0
      ? { targets: recursionTargets, active: new Set<object>(), backEdges: [] }
      : undefined;
  let typeBoxType: Code;
  try {
    typeBoxType = collect(dereferencedSchema);
  } finally {
    recursionState = undefined;
  }

  const exportedType = createExportedTypeForName(exportedName);

  return `${createImportStatements()}

${typeBoxType.includes("OneOf([") ? createOneOfTypeboxSupportCode() : ""}
${exportedType}
export const ${exportedName} = ${typeBoxType}`;
};

/**
 * Takes a schema node and returns matching typebox code. When the node is a
 * recursion target (detected up front in schema2typebox), it is wrapped in
 * Type.Recursive((This) => ...) and its self-references resolve to the
 * placeholder. With no active recursion state this is a no-op pass-through to
 * dispatch(), so direct callers (unit tests) keep the original behaviour.
 *
 * @throws Error if an unexpected schema (one with no matching parser) was given
 */
export const collect = (schema: JSONSchema7Definition): Code => {
  if (recursionState !== undefined && typeof schema === "object") {
    // Back-edge: this recursion target is already open on the current path.
    // Emit its placeholder instead of recursing forever, and log it so the
    // enclosing parseOneOf can decide between OneOf and Type.Union.
    if (recursionState.active.has(schema)) {
      recursionState.backEdges.push(schema);
      return recursionState.targets.get(schema) as string;
    }
    // First visit of a recursion target: open Type.Recursive and collect its
    // body. Children that point back here hit the branch above.
    const placeholder = recursionState.targets.get(schema);
    if (placeholder !== undefined) {
      recursionState.active.add(schema);
      const body = dispatch(schema);
      recursionState.active.delete(schema);
      return `Type.Recursive((${placeholder}) => ${body})`;
    }
  }
  return dispatch(schema);
};

/**
 * Dispatches a schema node to the matching parser. Extracted from collect() so
 * collect() can layer recursion handling on top without re-entering the
 * recursion check for the body of a Type.Recursive node.
 *
 * @throws Error if an unexpected schema (one with no matching parser) was given
 */
const dispatch = (schema: JSONSchema7Definition): Code => {
  // TODO: boolean schema support..?
  if (isBoolean(schema)) {
    return JSON.stringify(schema);
  } else if (isObjectSchema(schema)) {
    return parseObject(schema);
  } else if (isEnumSchema(schema)) {
    return parseEnum(schema);
  } else if (isAnyOfSchema(schema)) {
    return parseAnyOf(schema);
  } else if (isAllOfSchema(schema)) {
    return parseAllOf(schema);
  } else if (isOneOfSchema(schema)) {
    return parseOneOf(schema);
  } else if (isNotSchema(schema)) {
    return parseNot(schema);
  } else if (isArraySchema(schema)) {
    return parseArray(schema);
  } else if (isSchemaWithMultipleTypes(schema)) {
    return parseWithMultipleTypes(schema);
  } else if (isConstSchema(schema)) {
    return parseConst(schema);
  } else if (isUnknownSchema(schema)) {
    return parseUnknown(schema);
  } else if (schema.type !== undefined && !Array.isArray(schema.type)) {
    return parseTypeName(schema.type, schema);
  }
  throw new Error(
    `Unsupported schema. Did not match any type of the parsers. Schema was: ${JSON.stringify(
      schema
    )}`
  );
};

/**
 * Creates the imports required to build the typebox code.
 * Unused imports (e.g. if we don't need to create a TypeRegistry for OneOf
 * types) are stripped in a postprocessing step.
 */
const createImportStatements = () => {
  return [
    'import {Kind, SchemaOptions, Static, TSchema, TUnion, Type, TypeRegistry} from "@sinclair/typebox"',
    'import { Value } from "@sinclair/typebox/value";',
  ].join("\n");
};

const createExportNameForSchema = (schema: JSONSchema7Definition) => {
  if (isBoolean(schema)) {
    return "T";
  }
  const title = schema["title"] ?? "T";
  // converting these cases to pascalCase to ensure the resulting name is a
  // valid name for a typescript type. Based on: https://github.com/xddq/schema2typebox/pull/53
  if (
    title.includes(" ") ||
    title.includes("-") ||
    title.includes("_") ||
    title.includes(".")
  ) {
    return camelcase(title, { pascalCase: true });
  }
  return title;
};

/**
 * Creates custom typebox code to support the JSON schema keyword 'oneOf'. Based
 * on the suggestion here: https://github.com/xddq/schema2typebox/issues/16#issuecomment-1603731886
 */
export const createOneOfTypeboxSupportCode = (): Code => {
  return [
    "TypeRegistry.Set('ExtendedOneOf', (schema: any, value) => 1 === schema.oneOf.reduce((acc: number, schema: any) => acc + (Value.Check(schema, value) ? 1 : 0), 0))",
    "const OneOf = <T extends TSchema[]>(oneOf: [...T], options: SchemaOptions = {}) => Type.Unsafe<Static<TUnion<T>>>({ ...options, [Kind]: 'ExtendedOneOf', oneOf })",
  ].reduce((acc, curr) => {
    return acc + curr + "\n\n";
  }, "");
};

/**
 * @throws Error
 */
const createExportedTypeForName = (exportedName: string) => {
  if (exportedName.length === 0) {
    throw new Error("Can't create exported type for a name with length 0.");
  }
  const typeName = `${exportedName.charAt(0).toUpperCase()}${exportedName.slice(
    1
  )}`;
  return `export type ${typeName} = Static<typeof ${exportedName}>`;
};

const addOptionalModifier = (
  code: Code,
  propertyName: string,
  requiredProperties: JSONSchema7["required"]
) => {
  return requiredProperties?.includes(propertyName)
    ? code
    : `Type.Optional(${code})`;
};

export const parseObject = (schema: ObjectSchema) => {
  const schemaOptions = parseSchemaOptions(schema);
  const properties = schema.properties;
  const requiredProperties = schema.required;
  const additionalProperties = schema.additionalProperties;
  if (properties === undefined) {
    // If no properties are defined but additionalProperties exists, generate Type.Record
    if (additionalProperties && typeof additionalProperties === "object") {
      const valueType = collect(additionalProperties);
      return `Type.Record(Type.String(), ${valueType})`;
    }
    return `Type.Unknown()`;
  }
  const attributes = Object.entries(properties);
  // NOTE: Just always quote the propertyName here to make sure we don't run
  // into issues as they came up before
  // [here](https://github.com/xddq/schema2typebox/issues/45) or
  // [here](https://github.com/xddq/schema2typebox/discussions/35). Since we run
  // prettier as "postprocessor" anyway we will also ensure to still have a sane
  // output without any unnecessarily quotes attributes.

  if (attributes.length === 0) {
    if (additionalProperties !== undefined) {
      const valueType = collect(additionalProperties);
      return `Type.Record(Type.String(), ${valueType})`;
    }
    return schemaOptions === undefined
      ? `Type.Object({})`
      : `Type.Object({}, ${schemaOptions})`;
  }
  const code = attributes
    .map(([propertyName, schema]) => {
      return `"${propertyName}": ${addOptionalModifier(
        collect(schema),
        propertyName,
        requiredProperties
      )}`;
    })
    .join(",\n");

  if (additionalProperties) {
    const valueType = collect(additionalProperties);
    const additionalType = `Type.Record(Type.String(), ${valueType})`;
    return `Type.Union([Type.Object({${code}}), ${additionalType}])`;
  }
  return schemaOptions === undefined
    ? `Type.Object({${code}})`
    : `Type.Object({${code}}, ${schemaOptions})`;
};

export const parseEnum = (schema: EnumSchema) => {
  const schemaOptions = parseSchemaOptions(schema);
  const code = schema.enum.reduce<string>((acc, schema) => {
    return acc + `${acc === "" ? "" : ","} ${parseType(schema)}`;
  }, "");
  return schemaOptions === undefined
    ? `Type.Union([${code}])`
    : `Type.Union([${code}], ${schemaOptions})`;
};

export const parseConst = (schema: ConstSchema): Code => {
  const schemaOptions = parseSchemaOptions(schema);
  if (Array.isArray(schema.const)) {
    const code = schema.const.reduce<string>((acc, schema) => {
      return acc + `${acc === "" ? "" : ",\n"} ${parseType(schema)}`;
    }, "");
    return schemaOptions === undefined
      ? `Type.Union([${code}])`
      : `Type.Union([${code}], ${schemaOptions})`;
  }
  // TODO: case where const is object..?
  if (typeof schema.const === "object") {
    return "Type.Todo(const with object)";
  }
  if (typeof schema.const === "string") {
    return schemaOptions === undefined
      ? `Type.Literal("${schema.const}")`
      : `Type.Literal("${schema.const}", ${schemaOptions})`;
  }
  return schemaOptions === undefined
    ? `Type.Literal(${schema.const})`
    : `Type.Literal(${schema.const}, ${schemaOptions})`;
};

export const parseUnknown = (_: UnknownSchema): Code => {
  return "Type.Unknown()";
};

export const parseType = (type: JSONSchema7Type): Code => {
  if (isString(type)) {
    return `Type.Literal("${type}")`;
  } else if (isNullType(type)) {
    return `Type.Null()`;
  } else if (isNumber(type) || isBoolean(type)) {
    return `Type.Literal(${type})`;
  } else if (Array.isArray(type)) {
    return `Type.Array([${type.map(parseType)}])`;
  } else {
    const code = Object.entries(type).reduce<string>((acc, [key, value]) => {
      return acc + `${acc === "" ? "" : ",\n"}${key}: ${parseType(value)}`;
    }, "");
    return `Type.Object({${code}})`;
  }
};

export const parseAnyOf = (schema: AnyOfSchema): Code => {
  const schemaOptions = parseSchemaOptions(schema);
  const code = schema.anyOf.reduce<string>((acc, schema) => {
    return acc + `${acc === "" ? "" : ",\n"} ${collect(schema)}`;
  }, "");
  return schemaOptions === undefined
    ? `Type.Union([${code}])`
    : `Type.Union([${code}], ${schemaOptions})`;
};

export const parseAllOf = (schema: AllOfSchema): Code => {
  const schemaOptions = parseSchemaOptions(schema);
  const code = schema.allOf.reduce<string>((acc, schema) => {
    return acc + `${acc === "" ? "" : ",\n"} ${collect(schema)}`;
  }, "");
  return schemaOptions === undefined
    ? `Type.Intersect([${code}])`
    : `Type.Intersect([${code}], ${schemaOptions})`;
};

export const parseOneOf = (schema: OneOfSchema): Code => {
  const schemaOptions = parseSchemaOptions(schema);

  // Snapshot which recursion targets are already open (bound by an enclosing
  // Type.Recursive) and how many back-edges have been emitted so far.
  const enclosingActive =
    recursionState !== undefined ? new Set(recursionState.active) : undefined;
  const backEdgeStart =
    recursionState !== undefined ? recursionState.backEdges.length : 0;

  const code = schema.oneOf.reduce<string>((acc, schema) => {
    return acc + `${acc === "" ? "" : ",\n"} ${collect(schema)}`;
  }, "");

  // If a back-edge to an *enclosing* recursive node was emitted while collecting
  // members, this oneOf contains a free 'This' ref. The custom ExtendedOneOf
  // helper validates each subschema in isolation and cannot dereference such a
  // ref (throws ValueCheckDereferenceError at runtime), so emit native
  // Type.Union, which resolves recursive refs correctly. See issue #62.
  const hasFreeBackEdge =
    recursionState !== undefined &&
    enclosingActive !== undefined &&
    recursionState.backEdges.slice(backEdgeStart).some((target) => {
      return enclosingActive.has(target);
    });
  const wrapper = hasFreeBackEdge ? "Type.Union" : "OneOf";

  return schemaOptions === undefined
    ? `${wrapper}([${code}])`
    : `${wrapper}([${code}], ${schemaOptions})`;
};

export const parseNot = (schema: NotSchema): Code => {
  const schemaOptions = parseSchemaOptions(schema);
  return schemaOptions === undefined
    ? `Type.Not(${collect(schema.not)})`
    : `Type.Not(${collect(schema.not)}, ${schemaOptions})`;
};

export const parseArray = (schema: ArraySchema): Code => {
  const schemaOptions = parseSchemaOptions(schema);
  if (Array.isArray(schema.items)) {
    const code = schema.items.reduce<string>((acc, schema) => {
      return acc + `${acc === "" ? "" : ",\n"} ${collect(schema)}`;
    }, "");
    return schemaOptions === undefined
      ? `Type.Array(Type.Union(${code}))`
      : `Type.Array(Type.Union(${code}),${schemaOptions})`;
  }
  const itemsType = schema.items ? collect(schema.items) : "Type.Unknown()";
  return schemaOptions === undefined
    ? `Type.Array(${itemsType})`
    : `Type.Array(${itemsType},${schemaOptions})`;
};

export const parseWithMultipleTypes = (schema: MultipleTypesSchema): Code => {
  const code = schema.type.reduce<string>((acc, typeName) => {
    return (
      acc + `${acc === "" ? "" : ",\n"} ${parseTypeName(typeName, schema)}`
    );
  }, "");
  return `Type.Union([${code}])`;
};

export const parseTypeName = (
  type: JSONSchema7TypeName,
  schema: JSONSchema7 = {}
): Code => {
  const schemaOptions = parseSchemaOptions(schema);
  if (type === "number" || type === "integer") {
    return schemaOptions === undefined
      ? "Type.Number()"
      : `Type.Number(${schemaOptions})`;
  } else if (type === "string") {
    return schemaOptions === undefined
      ? "Type.String()"
      : `Type.String(${schemaOptions})`;
  } else if (type === "boolean") {
    return schemaOptions === undefined
      ? "Type.Boolean()"
      : `Type.Boolean(${schemaOptions})`;
  } else if (type === "null") {
    return schemaOptions === undefined
      ? "Type.Null()"
      : `Type.Null(${schemaOptions})`;
  } else if (type === "object") {
    return parseObject(schema as ObjectSchema);
    // We don't want to trust on build time checking here, json can contain anything
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  } else if (type === "array") {
    return parseArray(schema as ArraySchema);
  }
  throw new Error(`Should never happen..? parseType got type: ${type}`);
};

const parseSchemaOptions = (schema: JSONSchema7): Code | undefined => {
  const properties = Object.entries(schema).filter(([key, _value]) => {
    return (
      // NOTE: To be fair, not sure if we should filter out the title. If this
      // makes problems one day, think about not filtering it.
      key !== "title" &&
      key !== "type" &&
      key !== "items" &&
      key !== "allOf" &&
      key !== "anyOf" &&
      key !== "oneOf" &&
      key !== "not" &&
      key !== "properties" &&
      key !== "required" &&
      key !== "const" &&
      key !== "enum" &&
      // Definition containers are not validation options. After dereference
      // they are redundant and, for recursive schemas, hold a circular graph
      // that would explode JSON.stringify below. See issue #62.
      key !== "$defs" &&
      key !== "definitions"
    );
  });
  if (properties.length === 0) {
    return undefined;
  }
  const result = properties.reduce<Record<string, unknown>>(
    (acc, [key, value]) => {
      acc[key] = value;
      return acc;
    },
    {}
  );
  return JSON.stringify(result);
};
