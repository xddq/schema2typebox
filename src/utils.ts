/**
 * @name capitalize
 * @description
 * Capitalize the first letter of a string
 * @returns {string} The capitalized string
 */
export const capitalize = (name: string) => {
  const [head, ...tail] = name;
  if (head === undefined) {
    return name;
  }
  return `${head.toUpperCase()}${tail.join("")}`;
};
