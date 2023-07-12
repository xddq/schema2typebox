import fs from "node:fs";
import { zip } from "fp-ts/Array";
import $Refparser from "@apidevtools/json-schema-ref-parser";
import { capitalize } from "src/utils";

/** Generates TypeBox code from JSON schema */
export const schema2typebox = async (jsonSchema: string) => {
  const schemaObj = JSON.parse(jsonSchema);
  const dereferencedSchemaObj = await $Refparser.dereference(schemaObj);
  updateRequiredImports("@sinclair/typebox", ["Type", "Static"]);
  const typeBoxType = collect(dereferencedSchemaObj, []);
  // TODO: Are there alternative attributes people use for naming the entities?
  const valueName = dereferencedSchemaObj["title"] ?? "T";
  const typeForObj = generateTypeForName(valueName);

  return `${generateRequiredImports()}

${customTypes}${enumCode}${typeForObj}\nexport const ${valueName} = ${typeBoxType}`;
};

/**
 * "SimpleType" here basically means any type that is directly mapable to a
 * Typebox type without any recursion (everything besides "array" and "object"
 * in Practice :])
 */
const mapSimpleType = (
  type: SIMPLE_TYPE,
  schemaOptions: Record<string, any>
) => {
  const schemaOptionsString =
    Object.keys(schemaOptions).length > 0 ? JSON.stringify(schemaOptions) : "";
  // TODO: use if else or switch case later. throw error if no match
  return type === "string"
    ? `Type.String(${schemaOptionsString})`
    : type === "number"
    ? `Type.Number(${schemaOptionsString})`
    : type === "null"
    ? `Type.Null(${schemaOptionsString})`
    : type === "boolean"
    ? `Type.Boolean(${schemaOptionsString})`
    : "WRONG";
};

const mapTypeLiteral = (
  value: any,
  type: SIMPLE_TYPE,
  schemaOptions: Record<string, any>
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
  schemaObj: Record<string, any>
): schemaObj is AnyOfSchemaObj => {
  return schemaObj["anyOf"] !== undefined;
};
type AllOfSchemaObj = Record<string, any> & { allOf: Record<string, any>[] };
const isAllOfSchemaObj = (
  schemaObj: Record<string, any>
): schemaObj is AllOfSchemaObj => {
  return schemaObj["allOf"] !== undefined;
};
type EnumSchemaObj = Record<string, any> & { enum: any[] };
const isEnumSchemaObj = (
  schemaObj: Record<string, any>
): schemaObj is EnumSchemaObj => {
  return schemaObj["enum"] !== undefined;
};
type RefSchemaObj = { $ref: string };
const isRefSchemaObj = (
  schemaObj: Record<string, any>
): schemaObj is RefSchemaObj => {
  return schemaObj["$ref"] !== undefined;
};
type OneOfSchemaObj = Record<string, any> & { oneOf: Record<string, any>[] };
const isOneOfSchemaObj = (
  schemaObj: Record<string, any>
): schemaObj is OneOfSchemaObj => {
  return schemaObj["oneOf"] !== undefined;
};
type NotSchemaObj = Record<string, any> & { not: Record<string, any>[] };
const isNotSchemaObj = (
  schemaObj: Record<string, any>
): schemaObj is NotSchemaObj => {
  return schemaObj["not"] !== undefined;
};

const generateTypeForName = (name: string) => {
  if (!name?.length) {
    throw new Error(`Can't generate type for empty string. Got input: ${name}`);
  }
  const typeName = capitalize(name);
  return `export type ${typeName} = Static<typeof ${name}>`;
};
const createUnionName = (propertyName: string) => {
  if (!propertyName?.length) {
    throw new Error("Can't create union name with empty string.");
  }
  return `${capitalize(propertyName)}Union`;
};
const createEnumName = (propertyName: string) => {
  if (!propertyName?.length) {
    throw new Error("Can't create enum name with empty string.");
  }
  return `${capitalize(propertyName)}Enum`;
};

/**
 * Contains Typescript code for the enums that are created based on the JSON
 * schema.
 * NOTE: perhaps make this a map or something else if needed.
 **/
let enumCode = "";

/**
 * Workaround used for resetting enum code in test runs. Currently it would
 * otherwise not get reset in test runs. Thats what we get for using globally
 * mutable state :]. Probably adapt later, perhaps pass enumCode inside
 * collect() and adapt all collect() calls.
 */
export const resetEnumCode = () => {
  enumCode = "";
};

/**
 * Adds custom types to the typebox registry in order to validate them and use
 * the typecompiler against them. Used to e.g. implement 'oneOf' which does
 * normally not exist in typebox. This code has the drawback that is does not
 * compile to a validator when compiling the schema and is therefore a little
 * slower than standard types. However this approach was picked in order to
 * ensure sematic equality with the JSON schema sematics of oneOf.
 * For more info see: https://github.com/xddq/schema2typebox/issues/16
 */
let customTypes = "";

/**
 * Workaround used for resetting custom types code in test runs. Currently it
 * would otherwise not get reset in test runs. Thats what we get for using
 * globally mutable state :]. Probably adapt later, perhaps pass customTypes inside
 * collect() and adapt all collect() calls.
 */
export const resetCustomTypes = () => {
  customTypes = "";
};

/**
 * Enums in Typescript have been controversial and along with the limitations
 * around valid key names, many developers prefer to use Union Types. This config
 * will give the developer the option to choose between the two options.
 */
let enumMode: "enum" | "union" | "preferEnum" | "preferUnion" = "enum";

export const setEnumMode = (mode: typeof enumMode) => {
  enumMode = mode;
};

type PackageName = string;
type ImportValue = string;
const requiredImports = new Map<PackageName, Set<ImportValue>>();
export const resetRequiredImports = () => {
  requiredImports.clear();
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
  itemPropertyName?: string
): string => {
  const schemaOptions = getSchemaOptions(schemaObj).reduce<Record<string, any>>(
    (prev, [optionName, optionValue]) => {
      prev[optionName] = optionValue;
      return prev;
    },
    {}
  );
  const isRequiredAttribute = requiredAttributes.includes(
    propertyName ?? "__NO_MATCH__"
  );
  const isArrayItem = propertyName === undefined;

  // NOTE: for now assume it can only be file paths and it can only be relative
  // paths to the current working directory.
  if (isRefSchemaObj(schemaObj)) {
    const relativePath = schemaObj.$ref;
    const absolutePath = process.cwd() + "/" + relativePath;
    const schemaObjAsString = fs.readFileSync(absolutePath, "utf-8");
    const parsedSchemaObj = JSON.parse(schemaObjAsString);
    return collect(parsedSchemaObj, requiredAttributes, propertyName);
  }

  if (isEnumSchemaObj(schemaObj)) {
    if (propertyName === undefined && !itemPropertyName) {
      throw new Error("cant create enum without propertyName or path");
    }
    const enumValues = schemaObj.enum;
    const enumKeys = enumValues.map((currItem) =>
      String(currItem).toUpperCase()
    );
    const pairs = zip(enumKeys, enumValues);

    const enumName = createEnumName(propertyName || itemPropertyName || "");
    // create typescript enum
    const enumInTypescript =
      pairs.reduce<string>((prev, [enumKey, enumValue]) => {
        const correctEnumValue =
          typeof enumValue === "string" ? `"${enumValue}"` : enumValue;
        const correctEnumKey =
          enumKey === "" ? "EMPTY_STRING" : enumKey.replace(/[-]/g, "_");
        return `${prev}${correctEnumKey} = ${correctEnumValue},\n`;
      }, `export enum ${enumName} {\n`) + "}";
    const unionName = createUnionName(propertyName || itemPropertyName || "");
    const unionInTypescript =
      enumValues.reduce((prev, enumValue) => {
        const correctEnumValue =
          typeof enumValue === "string" ? `"${enumValue}"` : enumValue;

        return `${prev}Type.Literal(${correctEnumValue}),\n`;
      }, `export const ${unionName} = Type.Union([\n`) + "])";

    enumCode = [
      enumCode,
      /enum/i.test(enumMode) && enumInTypescript,
      /union/i.test(enumMode) && unionInTypescript,
      "\n\n",
    ]
      .filter((x) => !!x)
      .join("");

    let result = enumMode === "enum" ? unionName : `Type.Enum(${enumName})`;

    if (!isRequiredAttribute) {
      result = `Type.Optional(${result})`;
    }
    if (propertyName !== undefined) {
      result = `${propertyName}: ${result}`;
    }

    return result + "\n";
  }

  if (isAnyOfSchemaObj(schemaObj)) {
    const typeboxForAnyOfObjects = schemaObj.anyOf.map((currItem) =>
      collect(currItem)
    );
    let result = "";
    if (Object.keys(schemaOptions).length > 0) {
      result = `Type.Union([${typeboxForAnyOfObjects}],${JSON.stringify(
        schemaOptions
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
      collect(currItem)
    );
    let result = "";
    if (Object.keys(schemaOptions).length > 0) {
      result = `Type.Intersect([${typeboxForAllOfObjects}],${JSON.stringify(
        schemaOptions
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
    if (!customTypes.includes("TypeRegistry.Set('ExtendedOneOf'")) {
      const code = createOneOfTypeboxSupportCode();
      customTypes = customTypes + code;
    }
    const typeboxForOneOfObjects = schemaObj.oneOf.map((currItem) =>
      collect(currItem)
    );
    let result = "";
    if (Object.keys(schemaOptions).length > 0) {
      result = `OneOf([${typeboxForOneOfObjects}],${JSON.stringify(
        schemaOptions
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
        schemaOptions
      )})`;
    } else {
      result = `Type.Not(${typeboxForNotObjects})`;
    }

    if (propertyName !== undefined) {
      result = `${propertyName}: ${result}`;
    }
    return result + "\n";
  }

  const type = getType(schemaObj, propertyName);
  if (type === "object") {
    // console.log("type was object");
    const propertiesOfObj = getProperties(schemaObj);
    // TODO: replace "as string[]" here
    const requiredAttributesOfObject = (schemaObj["required"] ??
      []) as string[];

    let typeboxForProperties;
    let typeboxType = "Object";

    if (!propertiesOfObj) {
      typeboxForProperties = `Type.String(),\nType.Unknown()\n`;
      typeboxType = "Record";
      // Handle an "unknown" as a "record" type; could make configurable...
      return propertyName === undefined
        ? `Type.${typeboxType}(\n${typeboxForProperties})`
        : `${propertyName}: Type.${typeboxType}(\n${typeboxForProperties})`;
    } else {
      typeboxForProperties = propertiesOfObj.map(([propertyName, property]) => {
        return collect(property, requiredAttributesOfObject, propertyName);
      });
    }
    // propertyName will only be undefined for the "top level" schemaObj
    return propertyName === undefined
      ? `Type.${typeboxType}({\n${typeboxForProperties}})`
      : `${propertyName}: Type.${typeboxType}({\n${typeboxForProperties}})`;
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
          schemaOptions
        );
        return resultingType;
      }
      return mapSimpleType(type, schemaOptions);
    }

    if (isTypeLiteral) {
      const resultingType = mapTypeLiteral(
        schemaOptions["const"],
        type,
        schemaOptions
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
        "expected instance of type 'array' to contain 'items' object. Got: undefined"
      );
    }

    const itemPropertyName = `${propertyName}Item`;
    let result = "";
    if (Object.keys(schemaOptions).length > 0) {
      result = `Type.Array(${collect(
        itemsSchemaObj,
        undefined,
        undefined,
        itemPropertyName
      )}, (${JSON.stringify(schemaOptions)}))`;
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
  } else if (typeof type === "undefined") {
    let result = `Type.Unknown()`;
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
// strings?
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
 * schemaOptions (meaning something like "type", "anyOf", "allOf", etc.. is
 * ignored since it does not control the schemaOptions in typebox :]).
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
  schemaObj: Record<string, any>
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
type SIMPLE_TYPE = "null" | "string" | "number" | "boolean";

type PropertyName = string;
type PropertiesOfProperty = Record<string, any>;

/**
 * Returns a list containing the name of the property and its properties (as
 * object) for every property in the given schema.
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
  schema: Record<string, any>
): (readonly [PropertyName, PropertiesOfProperty])[] | undefined => {
  const properties = schema["properties"];
  if (properties === undefined) {
    return undefined;
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
const getType = (
  schemaObj: Record<string, any>,
  propertyName?: string
): VALID_TYPE_VALUE => {
  let type = schemaObj["type"];

  if (type?.constructor === Array) {
    type = type.filter((t) => t !== "null");
    if (type.length > 1) {
      throw new Error(
        `[${propertyName}] Cannot handle multiple types value for 'type' attribute. Got: ${schemaObj["type"]}`
      );
    }
    type = type[0];
  }

  if (
    !type &&
    schemaObj["default"] &&
    Object.keys(schemaObj["default"]).length > 0
  ) {
    return "object";
  }

  if (!VALID_TYPE_VALUES.includes(type) && Object.keys(schemaObj).length > 0) {
    throw new Error(
      `[${propertyName}] JSON schema had invalid value for 'type' attribute. Got: ${type} Schemaobject was: ${JSON.stringify(
        schemaObj
      )}`
    );
  }

  return type;
};

type Code = string;

/**
 * Updates the imports which are required for the generated code.
 */
const updateRequiredImports = (
  packageName: PackageName,
  importValues: ImportValue[]
) => {
  const currentImportValues = requiredImports.get(packageName);
  if (currentImportValues === undefined) {
    const newImportValues = new Set(importValues);
    requiredImports.set(packageName, newImportValues);
    return;
  }

  const updatedValues = importValues.reduce((acc, curr) => {
    return acc.add(curr);
  }, currentImportValues);
  requiredImports.set(packageName, updatedValues);
};

const generateRequiredImports = () => {
  const arr = Array.from(requiredImports);
  return arr.map(packageNameImportValuesTupleToCode).join("\n");
};

const packageNameImportValuesTupleToCode = ([packageName, importValues]: [
  PackageName,
  Set<ImportValue>
]): Code => {
  return `import {${Array.from(importValues.values())
    .sort()
    .reduce((acc, curr) => `${acc}, ${curr}`)}} from "${packageName}"`;
};

// based on suggestion from https://github.com/xddq/schema2typebox/issues/16#issuecomment-1603731886
export const createOneOfTypeboxSupportCode = (): Code => {
  updateRequiredImports("@sinclair/typebox", [
    "Kind",
    "SchemaOptions",
    "Static",
    "TSchema",
    "TUnion",
    "Type",
    "TypeRegistry",
  ]);
  updateRequiredImports("@sinclair/typebox/value", ["Value"]);
  const code =
    "TypeRegistry.Set('ExtendedOneOf', (schema: any, value) => 1 === schema.oneOf.reduce((acc: number, schema: any) => acc + (Value.Check(schema, value) ? 1 : 0), 0))" +
    "\n\n" +
    "const OneOf = <T extends TSchema[]>(oneOf: [...T], options: SchemaOptions = {}) => Type.Unsafe<Static<TUnion<T>>>({ ...options, [Kind]: 'ExtendedOneOf', oneOf })" +
    "\n\n";
  return code;
};

// Obsolete since it is supported out of the box. [src](https://github.com/xddq/schema2typebox/pull/21)
// export const createNotTypeboxSupportCode = (): Code => {
//   updateRequiredImports("@sinclair/typebox", [
//     "Kind",
//     "SchemaOptions",
//     "Static",
//     "TSchema",
//     "Type",
//     "TypeRegistry",
//   ]);
//   updateRequiredImports("@sinclair/typebox/value", ["Value"]);
//
//   const code =
//     "TypeRegistry.Set('ExtendedNot', (schema: any, value) => { return !Value.Check(schema.not, value); });" +
//     "\n\n" +
//     "const Not = <T extends TSchema>(not: T, options: SchemaOptions = {}) => Type.Unsafe({ ...options, [Kind]: 'ExtendedNot', not });" +
//     "\n\n";
//   return code;
// };
