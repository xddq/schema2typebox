export const capitalize = (name: string) => {
  const [head, ...tail] = name;
  if (head === undefined) {
    return name;
  }
  return `${head.toUpperCase()}${tail.join("")}`;
};
