import { Type, Static } from "@sinclair/typebox";

type T = Static<typeof T>;
const T = Type.Object({
  nickname: Type.Literal("xddq"),
  x: Type.Literal(99),
  y: Type.Literal(true),
  z: Type.Literal(false),
  a: Type.Array(Type.Literal(1)),
  b: Type.Array(Type.Literal("hi")),
  c: Type.Optional(Type.Literal(10)),
  d: Type.Optional(Type.Array(Type.Literal(1))),
  e: Type.Optional(Type.Array(Type.Literal("hi"))),
});
