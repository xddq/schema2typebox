import { Type, Static } from "@sinclair/typebox";

type T = Static<typeof T>;
const T = Type.Object({
  a: Type.Union([Type.Literal(1), Type.Literal(2)]),
  b: Type.Optional(Type.Union([Type.String(), Type.Number(), Type.Null()])),
  c: Type.Union([Type.String({ maxLength: 20 }), Type.Literal(1)], {
    description: "a union type",
  }),
});
