/**
 * Used to generate JSON schemas with typebox. This is done to get a practical
 * overview of how schemas might look like and test/develop against them.
 * For reference/example check the issue here:
 * https://github.com/sinclairzx81/typebox/issues/345
 **/

import { Static, Type } from "@sinclair/typebox";
import fs from "node:fs";

type Person = {
  name: string;
  age: number;
};

const PersonSchema = Type.Object({
  name: Type.String(),
  age: Type.Number(),
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

const x: Equal<Person, PersonTypeFromSchema> = true;
console.log(
  "dummy output in generate-schema.ts to quickly get rid of unused var error :] ",
  x
);

export const generateDummySchema = () => {
  const schemaAsString = JSON.stringify(PersonSchema, null, 2);
  fs.writeFileSync(
    process.cwd() + "/dummy-schema.json",
    schemaAsString,
    "utf-8"
  );
};
