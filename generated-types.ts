import { Type, Static } from "@sinclair/typebox";

type T = Static<typeof T>;
const T = Type.Object({
  a: Type.Intersect([Type.Literal(1), Type.Literal(2)]),
  b: Type.Optional(Type.Intersect([Type.String(), Type.Number()])),
  c: Type.Intersect(
    [Type.String({ description: "important" }), Type.Number({ minimum: 1 })],
    { description: "intersection of two types" }
  ),
});
