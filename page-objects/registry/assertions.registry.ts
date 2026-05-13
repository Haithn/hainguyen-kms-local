import { lazyInstantiate } from "page-objects/registry/lazy-instantiate";
import { type PageType } from "page-objects/registry/pages.registry";
import * as evolveAssertions from "../assertions/evolve/evolve.assertions.index";

export function assertionsRegistry(pages: PageType) {
  return {
    evolve: lazyInstantiate(pages.evolve, evolveAssertions),
  };
}

export type AssertionType = ReturnType<typeof assertionsRegistry>;
