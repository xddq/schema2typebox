/** Generates TypeBox code from JSON schema */
export const schema2Typebox = (jsonSchema: string) => {
  // Just thinking out "loud" with quick thoughts, not having put to much time
  // into this.
  //
  // TODO: (perhaps?) check for any json schema parsers that are available.
  // Otherwise I guess simply parsing the jsonSchema string into an object (I
  // guess it is always a JSON object?) and iterating the keys via something
  // like "Object.keys" should do it.
  // console.log("** for now we are just printing the schema itself **");
  // console.log(jsonSchema);
  const schemaObj = JSON.parse(jsonSchema);
  console.error("Schema that was given\n", jsonSchema);
  const result = collect(schemaObj, []);
  return result;
};

/**
 *
 * @param requiredAttributes The required attributes/properties of the given schema object. Recursively passed down for each given object.
 * @param propertyName The name of the attribute/property currently being collected.
 * @throws Error
 */
const collect = (
  schemaObj: Record<string, any>,
  requiredAttributes: string[],
  propertyName?: string
): string => {
  const type = getType(schemaObj);
  if (type === "object") {
    console.log("type was object");
    const propertiesOfObj = getProperties(schemaObj);
    // TODO: replace "as string[]" here
    const requiredAttributesOfObject = (schemaObj["required"] ??
      []) as string[];
    const typeboxForProperties = propertiesOfObj.map(
      ([propertyName, property]) => {
        return collect(property, requiredAttributesOfObject, propertyName);
      }
    );
    return `Type.Object({\n${typeboxForProperties}\n})`;
  } else if (type === "string") {
    if (propertyName === undefined) {
      throw new Error("expected propertyName to be defined. Got: undefined");
    }
    return requiredAttributes.includes(propertyName)
      ? `${propertyName}: Type.String()\n`
      : `${propertyName}: Type.Optional(Type.String())\n`;
  }
  throw new Error(`cant collect ${type} yet`);
};

/**
 * List of valid JSON schema values for the "type" attribute.
 * src: https://datatracker.ietf.org/doc/html/draft-wright-json-schema-01#section-4.2
 * src: https://json-schema.org/learn/miscellaneous-examples.html
 *
 * "An instance has one of six primitive types, and a range of possible
   values depending on the type:"
 */
const VALID_TYPE_VALUES = ["object", "string"] as const;
type VALID_TYPE_VALUE = (typeof VALID_TYPE_VALUES)[number];

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
): (readonly [PropertyName, PropertiesOfProperty])[] => {
  const properties = schema["properties"];
  if (properties === undefined) {
    throw new Error(
      "JSON schema was expected to have 'properties' attribute/property. Got: undefined"
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
      `JSON schema had invalid value for 'type' attribute. Got: ${type}`
    );
  }

  return type;
};

export const generate = () => {};

export const visit = () => {};
