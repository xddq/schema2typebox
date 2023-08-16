/**
 * Type guards for determining the type of schema we are currently working on.
 * E.g. an anyOf schema object, oneOf, enum, const, etc..
 */

export type AnyOfSchemaObj = Record<string, any> & {
  anyOf: Record<string, any>[];
};
export const isAnyOfSchemaObj = (
  schemaObj: Record<string, any>,
): schemaObj is AnyOfSchemaObj => {
  return schemaObj["anyOf"] !== undefined;
};

export type AllOfSchemaObj = Record<string, any> & {
  allOf: Record<string, any>[];
};
export const isAllOfSchemaObj = (
  schemaObj: Record<string, any>,
): schemaObj is AllOfSchemaObj => {
  return schemaObj["allOf"] !== undefined;
};

export type EnumSchemaObj = Record<string, any> & { enum: any[] };
export const isEnumSchemaObj = (
  schemaObj: Record<string, any>,
): schemaObj is EnumSchemaObj => {
  return schemaObj["enum"] !== undefined;
};

export type OneOfSchemaObj = Record<string, any> & {
  oneOf: Record<string, any>[];
};
export const isOneOfSchemaObj = (
  schemaObj: Record<string, any>,
): schemaObj is OneOfSchemaObj => {
  return schemaObj["oneOf"] !== undefined;
};

export type NotSchemaObj = Record<string, any> & { not: Record<string, any>[] };
export const isNotSchemaObj = (
  schemaObj: Record<string, any>,
): schemaObj is NotSchemaObj => {
  return schemaObj["not"] !== undefined;
};
