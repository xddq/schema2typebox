// NOTE: these are the most "high level" tests. Create them sparsely. Focus on
// cli usage aspects rather then implementation of the business logic below it.
// describe("cli usage", () => {
// TODO: how can we test this?
// test("pipes to stdout if -h or --help is given", async () => {
//   Ideas:
//     - can we provide process.stdout with our own stream and check the
//   output?
//     - can we mock process.stdout? does not work with mock.method since
//     process.stdout is not a function.
//   const getHelpTextMock = mock.method(getHelpText, "run", () => {});
//   await runCli();
//   assert.equal(getHelpTextMock.mock.callCount(), 10);
// });
// });
