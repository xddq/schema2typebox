import {
  Type,
  Kind,
  TypeRegistry,
  Static,
  TSchema,
  SchemaOptions,
} from "@sinclair/typebox";

// --------------------------------------------------------------------
// Registry
// --------------------------------------------------------------------

TypeRegistry.Set("ExtendedNot", (schema: any, value) => {
  console.log(JSON.stringify(schema));
  return !Value.Check(schema.not, value);
});

// --------------------------------------------------------------------
// Support Types
// --------------------------------------------------------------------
const Not = <T extends TSchema>(not: T, options: SchemaOptions = {}) =>
  Type.Unsafe({ ...options, [Kind]: "ExtendedNot", not });

// --------------------------------------------------------------------
// Example
// --------------------------------------------------------------------

import { Value } from "@sinclair/typebox/value";

const T = Type.Object({
  x: Not(Type.Number()),
});

type T = Static<typeof T>;

// testing Not
console.log(Value.Check(T, { x: "q" })); // true (x passes, y passes)
console.log(Value.Check(T, { x: 42 })); // false (x passes, y fails)
