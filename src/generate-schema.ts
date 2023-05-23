/**
 * Used to generate JSON schemas with typebox. This is done to get a practical
 * overview of how schemas might look like and test/develop against them.
 * For reference/example check the issue here:
 * https://github.com/sinclairzx81/typebox/issues/345
 **/

import { Static, Type } from "@sinclair/typebox";
import fs from "node:fs";

type Person = {
  nickname: "xddq";
  x: 99;
  y: true;
  z: false;
  a: 1[];
  b: "hi"[];
  c?: 10;
  d?: 1[];
  e?: "hi"[];
};

const PersonSchema = Type.Object({
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

type PersonTypeFromSchema = Static<typeof PersonSchema>;

/**
 *
 * This is just a utility type and const assignment to ensure that the generated
 * type and what we wanted to generate is actually the same. If const x: ... is
 * an error for typescript, we have a mismatch in types.
 * NOTE: could cause troubles when we have json schema options, but for now it
 * should work.
 */
type Equal<T, U> = T extends U ? (U extends T ? true : false) : false;
export const x: Equal<Person, PersonTypeFromSchema> = true;

export const generateDummySchema = () => {
  const schemaAsString = JSON.stringify(PersonSchema, null, 2);
  fs.writeFileSync(process.cwd() + "/schema.json", schemaAsString, "utf-8");
};
