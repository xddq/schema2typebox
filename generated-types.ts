import { Type, Static } from "@sinclair/typebox";

type T = Static<typeof T>;
const T = Type.Object({
  funny: Type.Boolean(),
});
