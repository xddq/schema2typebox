import { describe, it } from "@jest/globals";
import * as fs from "node:fs";
import * as cli from "../src/cli";
import * as programmaticUsage from "../src/programmatic-usage";

jest.mock<typeof fs>("node:fs", () => {
  const actualModule = jest.requireActual<typeof fs>("node:fs");
  return {
    ...actualModule,
    writeFileSync: jest.fn(),
    readFileSync: jest.fn(),
  };
});

jest.mock<typeof programmaticUsage>("../src/programmatic-usage", () => {
  const actualModule = jest.requireActual<typeof programmaticUsage>(
    "../src/programmatic-usage"
  );
  return {
    ...actualModule,
    schema2typebox: async () => {
      return "DUMMY_RESULT";
    },
  };
});

describe("when running the cli", () => {
  it("returns help text with 'h' argument", async () => {
    process.argv = ["node", "dist/src/cli/index.js", "-h"];
    process.stdout.write = jest.fn();
    await cli.runCli();
    expect(process.stdout.write).toHaveBeenCalledTimes(1);
    expect(process.stdout.write).toHaveBeenCalledWith(cli.HELP_TEXT);
  });
  it("returns help text with 'help' argument", async () => {
    process.argv = ["node", "dist/src/cli/index.js", "--help"];
    process.stdout.write = jest.fn();
    await cli.runCli();
    expect(process.stdout.write).toHaveBeenCalledTimes(1);
    expect(process.stdout.write).toHaveBeenCalledWith(cli.HELP_TEXT);
  });

  it("returns output to stdout with 'output-stdout' argument", async () => {
    process.argv = ["node", "dist/src/cli/index.js", "--output-stdout"];
    process.stdout.write = jest.fn();
    await cli.runCli();
    expect(process.stdout.write).toHaveBeenCalledTimes(1);
  });

  it("'--output-stdout' has precedence over '--output'", async () => {
    process.argv = ["node", "dist/src/cli/index.js", "--output-stdout"];
    process.stdout.write = jest.fn();
    await cli.runCli();
    expect(process.stdout.write).toHaveBeenCalledTimes(1);
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it("writes to file without 'output-stdout' argument", async () => {
    process.argv = ["node", "dist/src/cli/index.js"];
    process.stdout.write = jest.fn();
    await cli.runCli();
    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    expect(process.stdout.write).not.toHaveBeenCalled();
  });

  it(`writes to file '${cli.DEFAULT_OUTPUT_FILE_NAME}' without an 'output' argument`, async () => {
    process.argv = ["node", "dist/src/cli/index.js"];
    process.stdout.write = jest.fn();
    await cli.runCli();
    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining(cli.DEFAULT_OUTPUT_FILE_NAME),
      expect.any(String),
      expect.any(String)
    );
    expect(process.stdout.write).not.toHaveBeenCalled();
  });

  it("writes to file based on 'output' argument", async () => {
    const output = "newfile.ts";
    process.argv = ["node", "dist/src/cli/index.js", "--output", output];
    process.stdout.write = jest.fn();
    await cli.runCli();
    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining(output),
      expect.any(String),
      expect.any(String)
    );
    expect(process.stdout.write).not.toHaveBeenCalled();
  });

  it(`reads from file '${cli.DEFAULT_INPUT_FILE_NAME}' without an 'input' argument`, async () => {
    const input = "dummyschema.json";
    process.argv = ["node", "dist/src/cli/index.js", "--input", input];
    process.stdout.write = jest.fn();
    await cli.runCli();
    expect(fs.readFileSync).toHaveBeenCalledTimes(1);
    expect(fs.readFileSync).toHaveBeenCalledWith(
      expect.stringContaining(input),
      expect.any(String)
    );
    expect(process.stdout.write).not.toHaveBeenCalled();
  });

  it(`reads from file based on 'input' argument`, async () => {
    const input = "dummyschema.json";
    process.argv = ["node", "dist/src/cli/index.js", "--input", input];
    process.stdout.write = jest.fn();
    await cli.runCli();
    expect(fs.readFileSync).toHaveBeenCalledTimes(1);
    expect(fs.readFileSync).toHaveBeenCalledWith(
      expect.stringContaining(input),
      expect.any(String)
    );
    expect(process.stdout.write).not.toHaveBeenCalled();
  });
});
