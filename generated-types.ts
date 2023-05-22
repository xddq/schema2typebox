import { Type, Static } from "@sinclair/typebox";

type T = Static<typeof T>;
const T = Type.Object({
  hobbies: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 }),
});
