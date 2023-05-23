import { Type, Static } from "@sinclair/typebox";

type T = Static<typeof T>
const T = Type.Object({
Type.Union([Type.Literal(1),Type.Literal(2)]),Type.Union([Type.String(),Type.Number(),Type.Null()])
})