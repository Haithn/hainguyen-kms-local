import { test as api } from "./api.fixture";
import { test as ui } from "./ui.fixture";
import { mergeTests } from "@playwright/test";

export const test = mergeTests(ui, api);
export { expect } from "@playwright/test";
