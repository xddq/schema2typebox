import $Refparser from "@apidevtools/json-schema-ref-parser";

/**
 * List of valid JSON schema values for the "type" attribute.
 * src: https://datatracker.ietf.org/doc/html/draft-wright-json-schema-01#section-4.2
 * src: https://json-schema.org/learn/miscellaneous-examples.html
 *
 * "An instance has one of six primitive types, and a range of possible
   values depending on the type:"
 */
const VALID_TYPE_VALUES = [
  "object",
  "string",
  "number",
  "null",
  "boolean",
  "array",
] as const;
type VALID_TYPE_VALUE = (typeof VALID_TYPE_VALUES)[number];
const SIMPLE_TYPE_VALUES = ["null", "string", "number", "boolean"] as const;
type SIMPLE_TYPE_VALUE = (typeof SIMPLE_TYPE_VALUES)[number];
type Code = string;

/** Generates TypeBox code from a given JSON schema */
export const schema2typebox = async (jsonSchema: string) => {
  const schemaObj = JSON.parse(jsonSchema);
  const dereferencedSchema = await $Refparser.dereference(schemaObj);

  const typeBoxType = collect(dereferencedSchema, []);
  const exportedName = createExportNameForSchema(dereferencedSchema);
  const exportedType = createExportedTypeForName(exportedName);

  return `${createImportStatements()}

${typeBoxType.includes("OneOf([") ? createOneOfTypeboxSupportCode() : ""}
${exportedType}
export const ${exportedName} = ${typeBoxType}`;
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

const createExportNameForSchema = (jsonSchema: $Refparser.JSONSchema) => {
  return jsonSchema["title"] ?? "T";
};

/**
 * @throws Error
 */
const createExportedTypeForName = (exportedName: string) => {
  if (exportedName.length === 0) {
    throw new Error("Can't create exported type for a name with length 0.");
  }
  const typeName = `${exportedName.charAt(0).toUpperCase()}${exportedName.slice(
    1,
  )}`;
  return `export type ${typeName} = Static<typeof ${exportedName}>`;
};

/**
 * "SimpleType" here basically means any type that is directly mapable to a
 * typebox type without any recursion (everything besides "array" and "object"
 * in Practice).
 *
 * @throws Error if given type was not in the set/union of string literal of possible values.
 */
const mapSimpleType = (
  type: SIMPLE_TYPE_VALUE,
  schemaOptions: Record<string, any>,
) => {
  const schemaOptionsString =
    Object.keys(schemaOptions).length > 0 ? JSON.stringify(schemaOptions) : "";
  if (!SIMPLE_TYPE_VALUES.includes(type)) {
    throw new Error(
      `Trying to map an unexpected type. Type was: ${type}. Expected possible values of type: ${JSON.stringify(
        SIMPLE_TYPE_VALUES,
      )}`,
    );
  }
  switch (type) {
    case "string":
      return `Type.String(${schemaOptionsString})`;
    case "number":
      return `Type.Number(${schemaOptionsString})`;
    case "boolean":
      return `Type.Boolean(${schemaOptionsString})`;
    case "null":
      return `Type.Null(${schemaOptionsString})`;
    default:
      throw new Error(
        `Type fell through switch case when mapping it. Type was: '${type}'`,
      );
  }
};

const mapTypeLiteral = (
  value: any,
  type: SIMPLE_TYPE_VALUE,
  schemaOptions: Record<string, any>,
) => {
  delete schemaOptions["const"];
  let result = "";
  const hasSchemaOptions = Object.keys(schemaOptions).length > 0;
  if (type === "null") {
    if (hasSchemaOptions) {
      result = `Type.Literal(null, ${JSON.stringify(schemaOptions)})`;
    } else {
      result = `Type.Literal(null)`;
    }
  } else if (type === "string") {
    if (hasSchemaOptions) {
      result = `Type.Literal("${value}", ${JSON.stringify(schemaOptions)})`;
    } else {
      result = `Type.Literal("${value}")`;
    }
  } else {
    if (hasSchemaOptions) {
      result = `Type.Literal(${value}, ${JSON.stringify(schemaOptions)})`;
    } else {
      result = `Type.Literal(${value})`;
    }
  }
  return result;
};

type AnyOfSchemaObj = Record<string, any> & { anyOf: Record<string, any>[] };
const isAnyOfSchemaObj = (
  schemaObj: Record<string, any>,
): schemaObj is AnyOfSchemaObj => {
  return schemaObj["anyOf"] !== undefined;
};
type AllOfSchemaObj = Record<string, any> & { allOf: Record<string, any>[] };
const isAllOfSchemaObj = (
  schemaObj: Record<string, any>,
): schemaObj is AllOfSchemaObj => {
  return schemaObj["allOf"] !== undefined;
};
type EnumSchemaObj = Record<string, any> & { enum: any[] };
const isEnumSchemaObj = (
  schemaObj: Record<string, any>,
): schemaObj is EnumSchemaObj => {
  return schemaObj["enum"] !== undefined;
};
type OneOfSchemaObj = Record<string, any> & { oneOf: Record<string, any>[] };
const isOneOfSchemaObj = (
  schemaObj: Record<string, any>,
): schemaObj is OneOfSchemaObj => {
  return schemaObj["oneOf"] !== undefined;
};
type NotSchemaObj = Record<string, any> & { not: Record<string, any>[] };
const isNotSchemaObj = (
  schemaObj: Record<string, any>,
): schemaObj is NotSchemaObj => {
  return schemaObj["not"] !== undefined;
};

/**
 * Takes the root schemaObject and recursively collects the corresponding types
 * for it. Returns the matching typebox code representing the schemaObject.
 *
 * @param requiredAttributes The required attributes/properties of the given schema object. Recursively passed down for each given object.
 * @param propertyName The name of the attribute/property currently being collected.
 * @throws Error
 */
export const collect = (
  schemaObj: Record<string, any>,
  requiredAttributes: string[] = [],
  propertyName?: string,
): string => {
  const schemaOptions = getSchemaOptions(schemaObj).reduce<Record<string, any>>(
    (prev, [optionName, optionValue]) => {
      prev[optionName] = optionValue;
      return prev;
    },
    {},
  );
  const isRequiredAttribute = requiredAttributes.includes(
    propertyName ?? "__NO_MATCH__",
  );
  const isArrayItem = propertyName === undefined;

  if (isEnumSchemaObj(schemaObj)) {
    let result =
      schemaObj.enum
        .map((enumValue) => {
          return typeof enumValue === "string"
            ? `Type.Literal("${enumValue}")`
            : `Type.Literal(${enumValue})`;
        })
        .reduce((prev, curr) => {
          if (prev === "Type.Union([") {
            return `${prev} ${curr}`;
          }
          return `${prev}, ${curr}`;
        }, "Type.Union([") + "])";

    if (!isRequiredAttribute) {
      result = `Type.Optional(${result})`;
    }

    if (propertyName === undefined) {
      return result;
    }
    return `${propertyName}: ${result}` + "\n";
  }

  if (isAnyOfSchemaObj(schemaObj)) {
    const typeboxForAnyOfObjects = schemaObj.anyOf.map((currItem) =>
      collect(currItem),
    );
    let result = "";
    if (Object.keys(schemaOptions).length > 0) {
      result = `Type.Union([${typeboxForAnyOfObjects}],${JSON.stringify(
        schemaOptions,
      )})`;
    } else {
      result = `Type.Union([${typeboxForAnyOfObjects}])`;
    }

    if (propertyName !== undefined) {
      result = `${propertyName}: ${result}`;
    }
    return result + "\n";
  }

  if (isAllOfSchemaObj(schemaObj)) {
    const typeboxForAllOfObjects = schemaObj.allOf.map((currItem) =>
      collect(currItem),
    );
    let result = "";
    if (Object.keys(schemaOptions).length > 0) {
      result = `Type.Intersect([${typeboxForAllOfObjects}],${JSON.stringify(
        schemaOptions,
      )})`;
    } else {
      result = `Type.Intersect([${typeboxForAllOfObjects}])`;
    }

    if (propertyName !== undefined) {
      result = `${propertyName}: ${result}`;
    }
    return result + "\n";
  }
  if (isOneOfSchemaObj(schemaObj)) {
    const typeboxForOneOfObjects = schemaObj.oneOf.map((currItem) =>
      collect(currItem),
    );
    let result = "";
    if (Object.keys(schemaOptions).length > 0) {
      result = `OneOf([${typeboxForOneOfObjects}],${JSON.stringify(
        schemaOptions,
      )})`;
    } else {
      result = `OneOf([${typeboxForOneOfObjects}])`;
    }

    if (propertyName !== undefined) {
      result = `${propertyName}: ${result}`;
    }
    return result + "\n";
  }

  if (isNotSchemaObj(schemaObj)) {
    const typeboxForNotObjects = collect(schemaObj.not);
    let result = "";
    if (Object.keys(schemaOptions).length > 0) {
      result = `Type.Not(${typeboxForNotObjects},${JSON.stringify(
        schemaOptions,
      )})`;
    } else {
      result = `Type.Not(${typeboxForNotObjects})`;
    }

    if (propertyName !== undefined) {
      result = `${propertyName}: ${result}`;
    }
    return result + "\n";
  }

  const type = getType(schemaObj);
  if (type === "object") {
    // console.log("type was object");
    const propertiesOfObj = getProperties(schemaObj);
    // TODO: replace "as string[]" here
    const requiredAttributesOfObject = (schemaObj["required"] ??
      []) as string[];
    const typeboxForProperties = propertiesOfObj.map(
      ([propertyName, property]) => {
        return collect(property, requiredAttributesOfObject, propertyName);
      },
    );
    // propertyName will only be undefined for the "top level" schemaObj
    return propertyName === undefined
      ? `Type.Object({\n${typeboxForProperties}})`
      : `${propertyName}: Type.Object({\n${typeboxForProperties}})`;
  } else if (
    type === "string" ||
    type === "number" ||
    type === "null" ||
    type === "boolean"
  ) {
    // console.log("type was string or number or null or boolean");

    const isTypeLiteral = schemaOptions["const"] !== undefined;
    if (isArrayItem) {
      if (isTypeLiteral) {
        const resultingType = mapTypeLiteral(
          schemaOptions["const"],
          type,
          schemaOptions,
        );
        return resultingType;
      }
      return mapSimpleType(type, schemaOptions);
    }

    if (isTypeLiteral) {
      const resultingType = mapTypeLiteral(
        schemaOptions["const"],
        type,
        schemaOptions,
      );
      return isRequiredAttribute
        ? `${propertyName}: ${resultingType}\n`
        : `${propertyName}: Type.Optional(${resultingType})\n`;
    }

    const resultingType = mapSimpleType(type, schemaOptions);
    return isRequiredAttribute
      ? `${propertyName}: ${resultingType}\n`
      : `${propertyName}: Type.Optional(${resultingType})\n`;
  } else if (type === "array") {
    // console.log("type was array");
    // assumes that instance of type "array" has the "items" key.
    const itemsSchemaObj = schemaObj["items"];
    if (itemsSchemaObj === undefined) {
      throw new Error(
        "expected instance of type 'array' to contain 'items' object. Got: undefined",
      );
    }

    let result = "";
    if (Object.keys(schemaOptions).length > 0) {
      result = `Type.Array(${collect(itemsSchemaObj)}, (${JSON.stringify(
        schemaOptions,
      )}))`;
    } else {
      result = `Type.Array(${collect(itemsSchemaObj)})`;
    }
    if (!isRequiredAttribute) {
      result = `Type.Optional(${result})`;
    }
    if (propertyName !== undefined) {
      result = `${propertyName}: ${result}`;
    }
    return result + "\n";
  }

  throw new Error(`cant collect ${type} yet`);
};

// TODO: think about how we could chain "functions" to properly construct the
// strings? Probably use fp-ts flow
// const addOptional = (
//   requiredAttributes: string[],
//   propertyName: string | undefined,
//   rest: string
// ) => {
//   if (propertyName === undefined || requiredAttributes.includes(propertyName)) {
//     return rest;
//   }
//   return `Type.Optional(${rest})`;
// };

type SchemaOptionName = string;
type SchemaOptionValue = any;

/**
 * Takes an object describing a JSON schema instance and returns a list of
 * tuples for all attributes/properties where the first item is the attribute name and the second one the corresponding value.
 * Only returns property/value pairs which are required to build the typebox
 * schemaOptions. Something like "type", "anyOf", "allOf", etc.. is
 * ignored since it does not control the schemaOptions.
 *
 * Example:
 *
 * ```
 * {
 *   "description": "full name of the person",
 *   "type": "string"
 * }
 *
 * ```
 *
 * Returns:
 *
 * ```
 * [["description", "full name of the person"]]
 *
 * ```
 */
const getSchemaOptions = (
  schemaObj: Record<string, any>,
): (readonly [SchemaOptionName, SchemaOptionValue])[] => {
  const properties = Object.keys(schemaObj);
  const schemaOptionProperties = properties.filter((currItem) => {
    return (
      currItem !== "type" &&
      currItem !== "items" &&
      currItem !== "allOf" &&
      currItem !== "anyOf" &&
      currItem !== "oneOf" &&
      currItem !== "not"
    );
  });
  return schemaOptionProperties.map((currItem) => {
    return [currItem, schemaObj[currItem]] as const;
  });
};

type PropertyName = string;
type PropertiesOfProperty = Record<string, any>;

/**
 * Returns a list containing the name of the property and its properties (as
 * object) for every property in the given schema.
 *
 * @throws Error
 *
 * Example:
 *
 * ```
 * {"properties":
 *     { "name": {
 *         "type": "string"
 *       }
 *     },
 * }
 * ```
 *
 * Returns
 *
 * ```
 * [["name", {"type": "string"}]]
 * ```
 */
const getProperties = (
  schema: Record<string, any>,
): (readonly [PropertyName, PropertiesOfProperty])[] => {
  const properties = schema["properties"];
  if (properties === undefined) {
    throw new Error(
      "JSON schema was expected to have 'properties' attribute/property. Got: undefined",
    );
  }
  const propertyNames = Object.keys(properties);
  const listWithPropertyObjects = propertyNames.map((currItem) => {
    if (currItem === undefined) {
      throw new Error(`Value for property name ${currItem} was undefined.`);
    }
    const objectForProperty = properties[currItem] as Record<string, any>;
    return [currItem, objectForProperty] as const;
  });
  return listWithPropertyObjects;
};

/**
 * Gets the "type" of a JSON schema Instance
 * src: https://datatracker.ietf.org/doc/html/draft-wright-json-schema-01#section-4.2
 *
 * @throws Error
 */
const getType = (schemaObj: Record<string, any>): VALID_TYPE_VALUE => {
  const type = schemaObj["type"];

  if (!VALID_TYPE_VALUES.includes(type)) {
    throw new Error(
      `JSON schema had invalid value for 'type' attribute. Got: ${type}
      Schemaobject was: ${JSON.stringify(schemaObj)}
      Supported types are: ${JSON.stringify(VALID_TYPE_VALUES)}`,
    );
  }

  return type;
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
