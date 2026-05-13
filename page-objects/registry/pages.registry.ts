import { type Page } from "@playwright/test";
import * as evolvePages from "../pages/evolve/evolve.index";

import { lazyInstantiate } from "./lazy-instantiate";

export function pagesRegistry(page: Page) {
  return {
    evolve: lazyInstantiate(page, evolvePages),
  };
}

export type PageType = ReturnType<typeof pagesRegistry>;
