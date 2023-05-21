import { Type, Static } from "@sinclair/typebox";

type T = Static<typeof T>;
const T = Type.Object({
  name: Type.Optional(Type.String({ description: "full name of the person" })),
});
