import { Type, Static } from "@sinclair/typebox";

export enum StatusEnum {
  UNKNOWN = "unknown",
  ACCEPTED = "accepted",
  DENIED = "denied",
}

type T = Static<typeof T>;
const T = Type.Object({
  status: Type.Enum(StatusEnum),
});
