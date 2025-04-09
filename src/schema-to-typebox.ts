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
// import util from 'node:util';

type Code = string;
type ModuleEntries = Map<string, Code>;

/** Generates TypeBox code from a given JSON schema */
export const schema2typebox = async (jsonSchema: string | string[]) => {
  const entries: ModuleEntries = new Map<string, Code>();
  const schemas = Array.isArray(jsonSchema) ? jsonSchema : [jsonSchema];
  const parsedSchemas = await Promise.all(
    schemas.map((jsonSchema) => {
      return $Refparser.dereference(
        JSON.parse(jsonSchema)
      ) as JSONSchema7Definition;
    })
  );
  for (let i = 0; i < parsedSchemas.length; i++) {
    const parsedSchema = parsedSchemas[i]!;
    parseSchema(parsedSchema, entries);
  }
  const typeBoxType = Array.from(entries.entries())
    .map(([key, value]) => {
      return `${key}: ${value}`;
    })
    .join(",\n");
  const typeAliases = Array.from(entries.keys())
    .map((key) => {
      return `export const ${key} = Module.Import('${key}');
    ${createExportedTypeForName(key)};`;
    })
    .join("\n");

  return `${createImportStatements()}

${typeBoxType.includes("OneOf([") ? createOneOfTypeboxSupportCode() : ""}
export const Module = Type.Module({${typeBoxType}});
${typeAliases}`;
};

const parseSchema = (
  dereferencedSchema: JSONSchema7Definition,
  entries: ModuleEntries
) => {
  const exportedName = createExportNameForSchema(dereferencedSchema);

  // Ensuring that generated typebox code will contain an '$id' field.
  // see: https://github.com/xddq/schema2typebox/issues/32
  if (
    typeof dereferencedSchema !== "boolean" &&
    dereferencedSchema.$id === undefined
  ) {
    dereferencedSchema.$id = exportedName;
  }
  collect(dereferencedSchema, entries);
};

/**
 * Takes the root schema and recursively collects the corresponding types
 * for it. Returns the matching typebox code representing the schema.
 *
 * @throws Error if an unexpected schema (one with no matching parser) was given
 */
export const collect = (
  schema: JSONSchema7Definition,
  entries: ModuleEntries
): Code => {
  if (typeof schema === "object" && schema.$id !== undefined) {
    const exportedName = createExportNameForSchema(schema);
    if (entries.has(exportedName)) {
      return `Type.Ref("${exportedName}")`;
    }
    // we add a placeholder to fill later
    // this is so that we can support recursive types (we can tell we've already seen this entry)
    entries.set(exportedName, ``);
  }

  const innerSchema = (() => {
    // TODO: boolean schema support..?
    if (isBoolean(schema)) {
      return JSON.stringify(schema);
    } else if (isObjectSchema(schema)) {
      return parseObject(schema, entries);
    } else if (isEnumSchema(schema)) {
      return parseEnum(schema);
    } else if (isAnyOfSchema(schema)) {
      return parseAnyOf(schema, entries);
    } else if (isAllOfSchema(schema)) {
      return parseAllOf(schema, entries);
    } else if (isOneOfSchema(schema)) {
      return parseOneOf(schema, entries);
    } else if (isNotSchema(schema)) {
      return parseNot(schema, entries);
    } else if (isArraySchema(schema)) {
      return parseArray(schema, entries);
    } else if (isSchemaWithMultipleTypes(schema)) {
      return parseWithMultipleTypes(schema, entries);
    } else if (isConstSchema(schema)) {
      return parseConst(schema);
    } else if (isUnknownSchema(schema)) {
      return parseUnknown(schema);
    } else if (schema.type !== undefined && !Array.isArray(schema.type)) {
      return parseTypeName(schema.type, schema, entries);
    }
    throw new Error(
      `Unsupported schema. Did not match any type of the parsers. Schema was: ${JSON.stringify(
        schema
      )}`
    );
  })();
  if (typeof schema === "object" && schema.$id !== undefined) {
    const exportedName = createExportNameForSchema(schema);
    entries.set(exportedName, innerSchema);
    return `Type.Ref("${exportedName}")`;
  }
  return innerSchema;
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

export const parseObject = (schema: ObjectSchema, entries: ModuleEntries) => {
  const schemaOptions = parseSchemaOptions(schema);
  const properties = schema.properties;
  const requiredProperties = schema.required;
  if (properties === undefined) {
    return `Type.Unknown()`;
  }
  const attributes = Object.entries(properties);
  // NOTE: Just always quote the propertyName here to make sure we don't run
  // into issues as they came up before
  // [here](https://github.com/xddq/schema2typebox/issues/45) or
  // [here](https://github.com/xddq/schema2typebox/discussions/35). Since we run
  // prettier as "postprocessor" anyway we will also ensure to still have a sane
  // output without any unnecessarily quotes attributes.
  const code = attributes
    .map(([propertyName, schema]) => {
      return `"${propertyName}": ${addOptionalModifier(
        collect(schema, entries),
        propertyName,
        requiredProperties
      )}`;
    })
    .join(",\n");
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

export const parseAnyOf = (
  schema: AnyOfSchema,
  entries: ModuleEntries
): Code => {
  const schemaOptions = parseSchemaOptions(schema);
  const code = schema.anyOf.reduce<string>((acc, schema) => {
    return acc + `${acc === "" ? "" : ",\n"} ${collect(schema, entries)}`;
  }, "");
  return schemaOptions === undefined
    ? `Type.Union([${code}])`
    : `Type.Union([${code}], ${schemaOptions})`;
};

export const parseAllOf = (
  schema: AllOfSchema,
  entries: ModuleEntries
): Code => {
  const schemaOptions = parseSchemaOptions(schema);
  const code = schema.allOf.reduce<string>((acc, schema) => {
    return acc + `${acc === "" ? "" : ",\n"} ${collect(schema, entries)}`;
  }, "");
  return schemaOptions === undefined
    ? `Type.Intersect([${code}])`
    : `Type.Intersect([${code}], ${schemaOptions})`;
};

export const parseOneOf = (
  schema: OneOfSchema,
  entries: ModuleEntries
): Code => {
  const schemaOptions = parseSchemaOptions(schema);
  const code = schema.oneOf.reduce<string>((acc, schema) => {
    return acc + `${acc === "" ? "" : ",\n"} ${collect(schema, entries)}`;
  }, "");
  return schemaOptions === undefined
    ? `OneOf([${code}])`
    : `OneOf([${code}], ${schemaOptions})`;
};

export const parseNot = (schema: NotSchema, entries: ModuleEntries): Code => {
  const schemaOptions = parseSchemaOptions(schema);
  return schemaOptions === undefined
    ? `Type.Not(${collect(schema.not, entries)})`
    : `Type.Not(${collect(schema.not, entries)}, ${schemaOptions})`;
};

export const parseArray = (
  schema: ArraySchema,
  entries: ModuleEntries
): Code => {
  const schemaOptions = parseSchemaOptions(schema);
  if (Array.isArray(schema.items)) {
    const code = schema.items.reduce<string>((acc, schema) => {
      return acc + `${acc === "" ? "" : ",\n"} ${collect(schema, entries)}`;
    }, "");
    return schemaOptions === undefined
      ? `Type.Array(Type.Union(${code}))`
      : `Type.Array(Type.Union(${code}),${schemaOptions})`;
  }
  const itemsType = schema.items
    ? collect(schema.items, entries)
    : "Type.Unknown()";
  return schemaOptions === undefined
    ? `Type.Array(${itemsType})`
    : `Type.Array(${itemsType},${schemaOptions})`;
};

export const parseWithMultipleTypes = (
  schema: MultipleTypesSchema,
  entries: ModuleEntries
): Code => {
  const code = schema.type.reduce<string>((acc, typeName) => {
    return (
      acc +
      `${acc === "" ? "" : ",\n"} ${parseTypeName(typeName, schema, entries)}`
    );
  }, "");
  return `Type.Union([${code}])`;
};

export const parseTypeName = (
  type: JSONSchema7TypeName,
  schema: JSONSchema7 = {},
  entries: ModuleEntries = new Map()
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
    return parseObject(schema as ObjectSchema, entries);
    // We don't want to trust on build time checking here, json can contain anything
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  } else if (type === "array") {
    return parseArray(schema as ArraySchema, entries);
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
      key !== "enum"
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
