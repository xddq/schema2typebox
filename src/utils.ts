/**
 * @description Capitalizes the first letter of a string
 * @throws Error if name is empty string
 * @returns The capitalized string
 */
export const capitalize = (name: string) => {
  const [head, ...tail] = name;
  // just name.length is needed but adding head === undefined check to make
  // typescript happy
  if (name.length === 0 || head === undefined) {
    throw new Error(
      "Unexpected input when capitalizing. Did not expect empty string."
    );
  }
  return `${head.toUpperCase()}${tail.join("")}`;
};
