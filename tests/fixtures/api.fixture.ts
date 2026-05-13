import { test as base, expect } from "@playwright/test";
import Env from "../../env/env.global";
import { RestClient, Domain } from "../../utils/api/axios.client";

type APIs = {
  api: RestClient;
};

export const test = base.extend<APIs>({
  api: async ({}, use) => {
    const request = new RestClient(Env.API_URL);
    await use(request);
    request.dispose();
  },
});

export { expect };
