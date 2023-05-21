#!/usr/bin/env node
import minimist from "minimist";

import { schema2typebox } from "./programmatic-usage";

const main = async () => {
  const args = minimist(process.argv.slice(2), {
    alias: {
      input: "i",
      output: "o",
      help: "h",
    },
    default: {
      input: "schema.json",
      output: "generated-types.ts",
    },
  });

  await schema2typebox({
    help: args.help,
    input: args.input,
    output: args.output,
    outputStdout: args["output-stdout"],
  });
};

main();
