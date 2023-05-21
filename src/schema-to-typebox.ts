/** Generates TypeBox code from JSON schema */
export const schema2Typebox = (jsonSchema: string) => {
  // Just thinking out "loud" with quick thoughts, not having put to much time
  // into this.
  //
  // TODO: (perhaps?) check for any json schema parsers that are available.
  // Otherwise I guess simply parsing the jsonSchema string into an object (I
  // guess it is always a JSON object?) and iterating the keys via something
  // like "Object.keys" should do it.
  console.log("** for now we are just printing the schema itself **");
  console.log(jsonSchema);
  return jsonSchema;
};
