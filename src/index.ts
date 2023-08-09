import {
  schema2typebox,
  Schema2TypeboxOptions,
  setAdditionalHeader,
} from "./programmatic-usage";
import { setEnumMode, setPackageName } from "./schema-to-typebox";

export { schema2typebox };
export type { Schema2TypeboxOptions };

export const api = { setEnumMode, setPackageName, setAdditionalHeader };
