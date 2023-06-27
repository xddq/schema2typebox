/**
 * Code from here: https://github.com/xddq/schema2typebox/issues/16#issuecomment-1603731886
 * Can run `npx ts-node validatingCustomOneof.ts` from inside the examples repo
 * (after dependencies were installed in root repo via `yarn`) to sanity check
 * the implementation.
 */
import {
  Type,
  Kind,
  TypeRegistry,
  Static,
  TSchema,
  TUnion,
  SchemaOptions,
} from "@sinclair/typebox";

// --------------------------------------------------------------------
// Registry
// --------------------------------------------------------------------
TypeRegistry.Set("StringEnum", (schema: any, value) =>
  schema.enum.includes(value)
);

TypeRegistry.Set(
  "ExtendedOneOf",
  (schema: any, value) =>
    1 ===
    schema.oneOf.reduce(
      (acc: number, schema: any) => acc + (Value.Check(schema, value) ? 1 : 0),
      0
    )
);

// --------------------------------------------------------------------
// Support Types
// --------------------------------------------------------------------
const StringEnum = <T extends string[]>(
  enum_: [...T],
  options: SchemaOptions = {}
) => Type.Unsafe<T[number]>({ ...options, [Kind]: "StringEnum", enum: enum_ });

const OneOf = <T extends TSchema[]>(
  oneOf: [...T],
  options: SchemaOptions = {}
) =>
  Type.Unsafe<Static<TUnion<T>>>({
    ...options,
    [Kind]: "ExtendedOneOf",
    oneOf,
  });

// --------------------------------------------------------------------
// Example
// --------------------------------------------------------------------

import { Value } from "@sinclair/typebox/value";

const T = Type.Object({
  x: OneOf([Type.String(), Type.String(), Type.Number()]),
  y: StringEnum(["A", "B", "C"]),
});

type T = Static<typeof T>;

console.log(Value.Check(T, { x: 42, y: "B" })); // true
console.log(Value.Check(T, { x: "hi", y: "B" })); // false
