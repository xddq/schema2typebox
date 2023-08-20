import $Refparser from "@apidevtools/json-schema-ref-parser";
import { isBoolean } from "fp-ts/lib/boolean";
import { isNumber } from "fp-ts/lib/number";
import { isString } from "fp-ts/lib/string";
import {
  JSONSchema7,
  JSONSchema7Definition,
  JSONSchema7Type,
  JSONSchema7TypeName,
} from "json-schema";

type Code = string;

/** Generates TypeBox code from a given JSON schema */
export const schema2typebox = async (jsonSchema: string) => {
  const schemaObj = JSON.parse(jsonSchema);
  const dereferencedSchema = (await $Refparser.dereference(
    schemaObj
  )) as JSONSchema7Definition;

  const typeBoxType = collect(dereferencedSchema);
  const exportedName = createExportNameForSchema(dereferencedSchema);
  const exportedType = createExportedTypeForName(exportedName);

  return `${createImportStatements()}

${typeBoxType.includes("OneOf([") ? createOneOfTypeboxSupportCode() : ""}
${exportedType}
export const ${exportedName} = ${typeBoxType}`;
};

/**
 * Takes the root schema and recursively collects the corresponding types
 * for it. Returns the matching typebox code representing the schema.
 *
 * @param requiredAttributes The required attributes/properties of the given schema object. Recursively passed down for each given object.
 * @param propertyName The name of the attribute/property currently being collected.
 * @throws Error
 */
export const collect = (schema: JSONSchema7Definition): Code => {
  // TODO: boolean schema support..?
  if (isBoolean(schema)) {
    return JSON.stringify(schema);
  } else if (isObjectSchema(schema)) {
    return parseObject(schema.properties, schema.required);
  } else if (isEnumSchema(schema)) {
    return parseEnum(schema.enum);
  } else if (isAnyOfSchema(schema)) {
    return parseAnyOf(schema);
  } else if (isAllOfSchema(schema)) {
    return parseAllOf(schema);
  } else if (isOneOfSchema(schema)) {
    return parseOneOf(schema);
  } else if (isNotSchema(schema)) {
    return parseNot(schema.not);
  } else if (isArraySchema(schema)) {
    return parseArray(schema);
  } else if (isSchemaWithMultipleTypes(schema)) {
    return parseWithMultipleTypes(schema.type);
  } else if (schema.type !== undefined && !Array.isArray(schema.type)) {
    if (isConstSchema(schema)) {
      return parseConst(schema);
    }
    return parseTypeName(schema.type, schema);
  } else return "dummy";
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
  return schema["title"] ?? "T";
};

/**
 * Creates custom typebox code to support the JSON schema keyword 'oneOf'. Based
 * on the suggestion here: https://github.com/xddq/schema2typebox/issues/16#issuecomment-1603731886
 */
export const createOneOfTypeboxSupportCode = (): Code => {
  return [
    "TypeRegistry.Set('ExtendedOneOf', (schema: any, value) => 1 === schema.oneOf.reduce((acc: number, schema: any) => acc + (Value.Check(schema, value) ? 1 : 0), 0))",
    "const OneOf = <T extends TSchema[]>(oneOf: [...T], options: SchemaOptions = {}) => Type.Unsafe<Static<TUnion<T>>>({ ...options, [Kind]: 'ExtendedOneOf', oneOf })",
  ].reduce((acc, curr) => acc + curr + "\n\n", "");
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

export const parseObject = (
  properties: JSONSchema7["properties"],
  requiredProperties: JSONSchema7["required"]
) => {
  if (properties === undefined) {
    return `Type.Unknown()`;
  }
  const attributes = Object.entries(properties);
  const code = attributes.reduce<string>((acc, [propertyName, schema]) => {
    return (
      acc +
      `${acc === "" ? "" : ",\n"}${propertyName}: ${addOptionalModifier(
        collect(schema),
        propertyName,
        requiredProperties
      )}`
    );
  }, "");
  return `Type.Object({${code}})`;
};

export const parseEnum = (values: JSONSchema7Type[]) => {
  const code = values.reduce<string>((acc, schema) => {
    return acc + `${acc === "" ? "" : ","} ${parseType(schema)}`;
  }, "");
  return `Type.Union([${code}])`;
};

export const isObjectSchema = (
  schema: Record<string, any>
): schema is JSONSchema7 & { type: "object" } => {
  return schema["type"] !== undefined && schema["type"] === "object";
};

export const isEnumSchema = (
  schema: Record<string, any>
): schema is JSONSchema7 & { enum: JSONSchema7Type[] } => {
  return schema["enum"] !== undefined;
};

type AnyOfSchema = JSONSchema7 & { anyOf: JSONSchema7Definition[] };
export const isAnyOfSchema = (
  schema: Record<string, any>
): schema is AnyOfSchema => {
  return schema["anyOf"] !== undefined;
};

type AllOfSchema = JSONSchema7 & { allOf: JSONSchema7Definition[] };
export const isAllOfSchema = (
  schema: Record<string, any>
): schema is AllOfSchema => {
  return schema["allOf"] !== undefined;
};

type OneOfSchema = JSONSchema7 & { oneOf: JSONSchema7Definition[] };
export const isOneOfSchema = (
  schema: Record<string, any>
): schema is JSONSchema7 & { oneOf: JSONSchema7Definition[] } => {
  return schema["oneOf"] !== undefined;
};

export const isNotSchema = (
  schema: Record<string, any>
): schema is JSONSchema7 & { not: JSONSchema7Definition[] } => {
  return schema["not"] !== undefined;
};

type ArraySchema = JSONSchema7 & {
  type: "array";
  items: JSONSchema7Definition | JSONSchema7Definition[];
};
export const isArraySchema = (
  schema: Record<string, any>
): schema is ArraySchema => {
  return schema.type === "array" && schema.items !== undefined;
};

type ConstSchema = JSONSchema7 & { const: JSONSchema7Type };
export const isConstSchema = (
  schema: Record<string, any>
): schema is ConstSchema => {
  return schema.const !== undefined;
};

const parseConst = (schema: ConstSchema): Code => {
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

export const isSchemaWithMultipleTypes = (
  schema: Record<string, any>
): schema is JSONSchema7 & { type: JSONSchema7TypeName[] } => {
  return Array.isArray(schema.type);
};

export const isStringType = (
  type: JSONSchema7Type
): type is JSONSchema7Type & string => {
  return typeof type === "string";
};

export const isNullType = (
  type: JSONSchema7Type
): type is JSONSchema7Type & null => {
  return type === null;
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
  const code = schema.oneOf.reduce<string>((acc, schema) => {
    return acc + `${acc === "" ? "" : ",\n"} ${collect(schema)}`;
  }, "");
  return schemaOptions === undefined
    ? `OneOf([${code}])`
    : `OneOf([${code}], ${schemaOptions})`;
};

export const parseNot = (not: JSONSchema7Definition): Code => {
  return `Type.Not(${collect(not)})`;
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
  return schemaOptions === undefined
    ? `Type.Array(${collect(schema.items)})`
    : `Type.Array(${collect(schema.items)},${schemaOptions})`;
};

export const parseWithMultipleTypes = (type: JSONSchema7TypeName[]): Code => {
  const code = type.reduce<string>((acc, typeName) => {
    return acc + `${acc === "" ? "" : ",\n"} ${parseTypeName(typeName)}`;
  }, "");
  return `Type.Union([${code}])`;
};

export const parseTypeName = (
  type: Omit<JSONSchema7TypeName, "array" | "object">,
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
  }
  throw new Error(`Should never happen..? parseType got type: ${type}`);
};

const parseSchemaOptions = (schema: JSONSchema7): Code | undefined => {
  const properties = Object.entries(schema).filter(
    ([key, _value]) =>
      key !== "type" &&
      key !== "items" &&
      key !== "allOf" &&
      key !== "anyOf" &&
      key !== "oneOf" &&
      key !== "not" &&
      key !== "properties" &&
      key !== "required" &&
      key !== "const"
  );
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
