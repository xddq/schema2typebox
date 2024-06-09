/**
 * Type guards for determining the type of schema we are currently working on.
 * E.g. an anyOf schema object, oneOf, enum, const, etc..
 */
import {
  JSONSchema7,
  JSONSchema7Definition,
  JSONSchema7Type,
  JSONSchema7TypeName,
} from "json-schema";

export type ObjectSchema = JSONSchema7 & { type: "object" };
export const isObjectSchema = (schema: JSONSchema7): schema is ObjectSchema => {
  return schema["type"] !== undefined && schema["type"] === "object";
};

export type EnumSchema = JSONSchema7 & { enum: JSONSchema7Type[] };
export const isEnumSchema = (schema: JSONSchema7): schema is EnumSchema => {
  return schema["enum"] !== undefined;
};

export type AnyOfSchema = JSONSchema7 & { anyOf: JSONSchema7Definition[] };
export const isAnyOfSchema = (schema: JSONSchema7): schema is AnyOfSchema => {
  return schema["anyOf"] !== undefined;
};

export type AllOfSchema = JSONSchema7 & { allOf: JSONSchema7Definition[] };
export const isAllOfSchema = (schema: JSONSchema7): schema is AllOfSchema => {
  return schema["allOf"] !== undefined;
};

export type OneOfSchema = JSONSchema7 & { oneOf: JSONSchema7Definition[] };
export const isOneOfSchema = (schema: JSONSchema7): schema is OneOfSchema => {
  return schema["oneOf"] !== undefined;
};

export type NotSchema = JSONSchema7 & { not: JSONSchema7Definition };
export const isNotSchema = (schema: JSONSchema7): schema is NotSchema => {
  return schema["not"] !== undefined;
};

export type ArraySchema = JSONSchema7 & {
  type: "array";
  items?: JSONSchema7Definition | JSONSchema7Definition[];
};
export const isArraySchema = (schema: JSONSchema7): schema is ArraySchema => {
  return schema.type === "array";
};

export type ConstSchema = JSONSchema7 & { const: JSONSchema7Type };
export const isConstSchema = (schema: JSONSchema7): schema is ConstSchema => {
  return schema.const !== undefined;
};

export type UnknownSchema = JSONSchema7 & Record<string, never>;
export const isUnknownSchema = (
  schema: JSONSchema7
): schema is UnknownSchema => {
  return typeof schema === "object" && Object.keys(schema).length === 0;
};

export type MultipleTypesSchema = JSONSchema7 & { type: JSONSchema7TypeName[] };
export const isSchemaWithMultipleTypes = (
  schema: JSONSchema7
): schema is MultipleTypesSchema => {
  return Array.isArray(schema.type);
};

export const isNullType = (type: JSONSchema7Type): type is null => {
  return type === null;
};
