import minimist from "minimist";
import { readFileSync, writeFileSync } from "node:fs";

import packageJson from "../package.json";
import { schema2typebox } from "./programmatic-usage";

export const runCli = async () => {
  const args = minimist(process.argv.slice(2), {
    alias: {
      input: "i",
      output: "o",
      help: "h",
    },
    default: {
      input: DEFAULT_INPUT_FILE_NAME,
      output: DEFAULT_OUTPUT_FILE_NAME,
    },
  });

  if (args.help) {
    return process.stdout.write(HELP_TEXT);
  }

  const typeboxCode = await schema2typebox({
    input: readFileSync(createInputPath(args.input), "utf-8"),
  });

  if (args["output-stdout"]) {
    return process.stdout.write(typeboxCode);
  }

  return writeFileSync(createOutputPath(args.output), typeboxCode, "utf-8");
};

export const createInputPath = (inputFileName: string) => {
  return process.cwd() + `/${inputFileName}`;
};

export const createOutputPath = (outputFileName: string) => {
  return process.cwd() + `/${outputFileName}`;
};

export const DEFAULT_INPUT_FILE_NAME = "schema.json";
export const DEFAULT_OUTPUT_FILE_NAME = "generated-typebox.ts";
export const HELP_TEXT = `
    schema2typebox generates TypeBox code from JSON schemas. The generated
    output is formatted based on the prettier config inside your repo (or the
    default one, if you don't have one). Version: ${packageJson.version}

    Usage:

    schema2typebox [ARGUMENTS]

    Arguments:

    -h, --help
       Displays this menu.

    -i, --input
       Specifies the relative path to the file containing the JSON schema that
       will be used to generated typebox code. Defaults to "${DEFAULT_INPUT_FILE_NAME}".

    -o, --output
       Specifies the relative path to generated file that will contain the
       typebox code. Defaults to "${DEFAULT_OUTPUT_FILE_NAME}".

    --output-stdout
       Does not generate an output file and prints the generated code to stdout
       instead. Has precedence over -o/--output.
 `;
