import {
  Type,
  Kind,
  TypeRegistry,
  Static,
  TSchema,
  TUnion,
  SchemaOptions,
} from "@sinclair/typebox";

TypeRegistry.Set(
  "OneOf",
  (schema: any, value) =>
    1 ===
    schema.oneOf.reduce(
      (acc: number, schema: any) => acc + (Value.Check(schema, value) ? 1 : 0),
      0
    )
);

const OneOf = <T extends TSchema[]>(
  oneOf: [...T],
  options: SchemaOptions = {}
) => Type.Unsafe<Static<TUnion<T>>>({ ...options, [Kind]: "OneOf", oneOf });

export type T = Static<typeof T>;
export const T = Type.Object({
  a: Type.OneOf([Type.String(), Type.Number()]),
});
