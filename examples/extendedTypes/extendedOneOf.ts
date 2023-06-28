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
TypeRegistry.Set("ExtendedOneOf", (schema: any, value) => {
  console.log(JSON.stringify(schema));
  return (
    1 ===
    schema.oneOf.reduce(
      (acc: number, schema: any) => acc + (Value.Check(schema, value) ? 1 : 0),
      0
    )
  );
});

// --------------------------------------------------------------------
// Support Types
// --------------------------------------------------------------------
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
});

type T = Static<typeof T>;

console.log(Value.Check(T, { x: 42 })); // true
console.log(Value.Check(T, { x: "hi" })); // false
