/**
 * Used to generate JSON schemas with typebox. This is done to get a practical
 * overview of how schemas might look like and test/develop against them.
 * For reference/example check the issue here:
 * https://github.com/sinclairzx81/typebox/issues/345
 **/

import { Static, Type } from "@sinclair/typebox";
import fs from "node:fs";

enum RequestStatus {
  ACCEPTED = "accepted",
  DENIED = "denied",
  UNKOWN = "unknown",
}

type Request = {
  status: RequestStatus;
};

const RequestSchema = Type.Object({
  status: Type.Enum(RequestStatus),
});

type TypeFromSchema = Static<typeof RequestSchema>;

/**
 *
 * This is just a utility type and const assignment to ensure that the generated
 * type and what we wanted to generate is actually the same. If const x: ... is
 * an error for typescript, we have a mismatch in types.
 * NOTE: could cause troubles when we have json schema options, but for now it
 * should work.
 */
type Equal<T, U> = T extends U ? (U extends T ? true : false) : false;
export const x: Equal<Request, TypeFromSchema> = true;

export const generateDummySchema = () => {
  const schemaAsString = JSON.stringify(RequestSchema, null, 2);
  fs.writeFileSync(process.cwd() + "/schema.json", schemaAsString, "utf-8");
};
