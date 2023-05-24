import { Type, Static } from "@sinclair/typebox";

export enum StatusEnum {
  1 = 1,
  TRUE = true,
  HELLO = "hello",
}

export enum OptionalStatusEnum {
  UNKNOWN = "unknown",
  ACCEPTED = "accepted",
  DENIED = "denied",
}

type T = Static<typeof T>;
const T = Type.Object({
  status: Type.Enum(StatusEnum),
  optionalStatus: Type.Optional(Type.Enum(OptionalStatusEnum)),
});
