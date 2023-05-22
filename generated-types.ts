import { Type, Static } from "@sinclair/typebox";

type T = Static<typeof T>;
const T = Type.Object({
  address: Type.Object({
    street: Type.String(),
    city: Type.String(),
  }),
});
