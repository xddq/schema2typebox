import {
  Kind,
  SchemaOptions,
  Static,
  TSchema,
  Type,
  TypeRegistry,
} from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

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

const T = Type.Object({
  x: Not(Type.Number()),
});

console.log(JSON.stringify(T));

type T = Static<typeof T>;

// testing Not
console.log(Value.Check(T, { x: "q" })); // true
console.log(Value.Check(T, { x: 42 })); // false
