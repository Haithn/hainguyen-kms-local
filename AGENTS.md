# Project Convention Guide

## Overview

AI-augmented test automation built on **Playwright** (UI/API), **Axios** (`RestClient`) for HTTP, and a `utils/db` layer for database validation. All layers share `env/env.global.ts` for environment config and `tests/fixtures/` for the fixture pipeline. AI agents and skills are first-class project citizens — every task routes through them.

---

## Project Structure

```
root/
├── ai/
│   ├── agents/               # orchestrator.agent.md — entry point
│   │   └── sub-agents/       # <role>.agent.md — one per sub-agent role
│   ├── context/              # shared AI state
│   ├── learn-review/         # post-run retrospectives
│   └── skills/
│       └── playwright-locator-healing/
│           ├── SKILL.md
│           ├── references/
│           └── scripts/
├── env/
│   ├── .env.<name>           # never commit real credentials
│   ├── .env.<name>.example
│   └── env.global.ts         # Env static class — single source of truth
├── page-objects/
│   ├── pages/
│   │   ├── evolve/
│   │   ├── ps/
│   │   └── shared/           # components reused across domains
│   ├── assertions/           # assertion classes per domain
│   ├── registry/             # page + assertion registries (lazy instantiation)
│   └── integration/          # multi-page flow helpers
├── tests/
│   ├── fixtures/             # ui · api · merged
│   └── specs/
│       ├── evolve/ ui/ · api/
│       ├── ps/    ui/ · api/
│       └── admin/ ui/ · api/
├── utils/
│   ├── api/                  # RestClient — axios.client.ts
│   ├── db/                   # database helpers
│   └── helpers/              # logger · timeouts · string · tags · wait-for-angular
└── pipeline/
```

---

## AI Agent System

Every task follows this exact chain — no exceptions, no shortcuts:

```
AGENTS.md  →  orchestrator.agent.md  →  sub-agent(s)
```

```
┌─────────────────────────────────────────────────────────────────┐
│                      Developer / AI Request                      │
│             Provides task, answers questions, approves           │
└─────────────────────────────────────────────────────────────────┘
                                   |
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                       ① AGENTS.md                              │
│           Read first — rules flow into every agent              │
└─────────────────────────────────────────────────────────────────┘
                                   |
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                   ② orchestrator.agent.md                       │
│        Mandatory gateway — coordinates and delegates            │
└─────────────────────────────────────────────────────────────────┘
         |                  |                  |                  |
         ▼                  ▼                  ▼                  ▼
 ③ pom-designer.    script-designer.   code-review.        code-refactor.
    agent              agent              agent               agent
         |                  |                  |                  |
  page-objects/        tests/specs/      Review report      page-objects/
  pages·assertions                                          tests/specs/
```

| Step | Who                     | Rule                                                    |
| ---- | ----------------------- | ------------------------------------------------------- |
| ①    | `AGENTS.md`             | Read first — rules flow into every agent and output     |
| ②    | `agent.orchestrator.md` | The only agent you ever activate directly               |
| ③    | Sub-agents              | Activated by orchestrator only — never invoked directly |

| Task the orchestrator identifies | Sub-agent it delegates to  |
| -------------------------------- | -------------------------- |
| Design a POM class               | `pom-designer.agent.md`    |
| Write a test spec                | `script-designer.agent.md` |
| Review code / PR                 | `code-review.agent.md`     |
| Refactor code                    | `code-refactor.agent.md`   |

> No code is written, renamed, moved, or deleted unless the full chain was followed. Bypassing the orchestrator is not permitted.

---

## Naming Conventions

### Casing

| Casing                 | Use for                         |
| ---------------------- | ------------------------------- |
| `kebab-case`           | All file names                  |
| `PascalCase`           | Classes, interfaces             |
| `camelCase`            | Variables, functions, methods   |
| `SCREAMING_SNAKE_CASE` | Enum members, env variable keys |

### File Patterns

| Item                   | Pattern                               | Example                                      |
| ---------------------- | ------------------------------------- | -------------------------------------------- |
| Page object            | `<name>.page.ts`                      | `login.page.ts`                              |
| Assertion class        | `<name>.assertion.ts`                 | `login.assertion.ts`                         |
| Domain page index      | `<domain>.index.ts`                   | `evolve.index.ts`                            |
| Domain assertion index | `<domain>.assertions.index.ts`        | `evolve.assertions.index.ts`                 |
| Integration flow       | `<flow>.flow.ts`                      | `login.flow.ts`                              |
| Test fixture           | `<scope>.fixture.ts`                  | `merged.fixture.ts`                          |
| Test spec              | `<domain>-<feature>.spec.ts`          | `evolve-login.spec.ts`                       |
| Orchestrator agent     | `orchestrator.agent.md`               | `ai/agents/orchestrator.agent.md`            |
| Sub-agent              | `<role>.agent.md`                     | `ai/agents/sub-agents/pom-designer.agent.md` |
| Env file               | `.env.<name>` / `.env.<name>.example` | `.env.test6`                                 |
| Registry               | `<name>.registry.ts`                  | `pages.registry.ts`                          |

---

## What Goes Where — Quick Reference

| You want to…                          | Put it in…                                                                               |
| ------------------------------------- | ---------------------------------------------------------------------------------------- |
| Add env variables                     | `env/.env.<name>` + static getter in `Env` class + `validateConfig()` in `env.global.ts` |
| Add a domain page class               | `page-objects/pages/<domain>/<name>.page.ts`                                             |
| Add a shared page / component         | `page-objects/pages/shared/<name>.page.ts`                                               |
| Add an assertion class                | `page-objects/assertions/<domain>/<name>.assertion.ts` + export from domain index        |
| Add a cross-page flow (2+ test files) | `page-objects/integration/<flow>.flow.ts`, class `<Flow>Flow`                            |
| Add a test spec                       | `tests/specs/<domain>/<ui\|api>/<feature>/<domain>-<feature>.spec.ts`                    |
| Add a helper / test data builder      | `utils/helpers/<name>.ts`                                                                |
| Add a DB utility                      | `utils/db/`                                                                              |
| Add an HTTP utility                   | `utils/api/`                                                                             |
| Add a sub-agent                       | `ai/agents/sub-agents/<role>.agent.md`                                                   |
| Add a skill                           | `ai/skills/<technology>-<topic>/SKILL.md`                                                |
| Add a pipeline                        | `pipeline/<name>.yml`                                                                    |

---

## Page Object Model (POM)

### Class template

```typescript
import { type Page } from '@playwright/test';

export class <Name>Page {
  elements = {
    <name>: () => this.page.getByTestId('<testid>'),
    <name>: () => this.page.getByRole('<role>', { name: '<name>' }),
    // FRAGILE: CSS fallback — ask dev to add data-testid="<name>"
    <name>: () => this.page.locator('.<css>'),
  };

  constructor(protected page: Page) {}

  /** Navigates to this page. @param baseURL - from Env */
  async goto(baseURL: string): Promise<void> {
    await this.page.goto(`${baseURL}/path`);
  }

  /** <What this achieves end-to-end.> @param <param> - <desc> */
  async <intentName>(<params>): Promise<void> {
    await this.elements.<name>().<action>();
  }
}
```

### Rules

- All locators are lazy lambdas inside `elements` — never inline in specs or tests.
- Locator priority: `testId ⭐⭐⭐⭐⭐ → role ⭐⭐⭐⭐ → label ⭐⭐⭐⭐ → placeholder ⭐⭐⭐ → text ⭐⭐ → CSS ⭐⭐ → XPath ⭐`
- Validate every locator with `playwright-cli` before writing — see `ai/skills/playwright-locator-healing/SKILL.md`.
- Public methods have JSDoc with `@param`; private helpers do not. No section header comments.
- Only allowed locator comment: `// FRAGILE:` — always include a request for `data-testid`.
- Check if the page class exists before creating. If shared across domains → `shared/`. If the same multi-page flow appears in 2+ tests → `integration/<flow>.flow.ts`.

---

## Assertion Classes

- Location: `page-objects/assertions/<domain>/<name>.assertion.ts`
- Class name: `<PageName>Assertion` — constructor receives the domain pages object, not a raw `Page`.
- All `expect()` calls live inside assertion methods — never directly in spec files.
- Method names describe state: `verifyInitialState()`, `verifyOtpSentState()`.
- Export from `<domain>.assertions.index.ts`. Access via `assertions.{domain}.{ClassName}`.

---

## Fixtures

| Fixture             | Provides                                      | Rule                               |
| ------------------- | --------------------------------------------- | ---------------------------------- |
| `ui.fixture.ts`     | `ui` (pages registry), `assertions`           | Do not import directly             |
| `api.fixture.ts`    | `api` — single `RestClient` for `Env.API_URL` | Do not import directly             |
| `merged.fixture.ts` | `ui`, `assertions`, `api`                     | The only fixture spec files import |

- Always import `test` and `expect` from `merged.fixture` — never from `@playwright/test` or other fixtures directly.
- Do not use `new` to instantiate page objects in tests. Local aliasing is fine: `const p = ui.evolve.LoginPage`.
- Credentials and URLs always come from `Env.*` — never hardcode.

---

## Test Conventions

### Structure and tagging

```typescript
import { test, expect } from "tests/fixtures/merged.fixture";
import { meta, TAGS } from "utils/helpers/tags";
import Env from "env/env.global";

test.describe("Evolve Sign-In Flow", () => {
  test.beforeEach(async ({ ui }) => {
    await ui.evolve.LoginPage.goToEvolveHomePage();
  });

  test(
    "redirects to dashboard after valid login",
    meta({
      tags: [TAGS.EVOLVE, TAGS.LOGIN, TAGS.SMOKE],
      jira: ["EDQAENG-12345"],
    }),
    async ({ ui, page }) => {
      await test.step("Step 1: Login → verify redirect", async () => {
        // Act
        await ui.evolve.LoginPage.login(
          Env.EXISTING_STUDENT_EMAIL,
          Env.COMMON_PASSWORD,
        );
        // Assert
        await expect(page).toHaveURL(/dashboard/);
      });
    },
  );
});
```

### Mandatory rules

| Rule                              | Detail                                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Steps in `test.step()`            | Label: `"Step N: <action> → <expected outcome>"`. Inline `// Act` / `// Assert` permitted inside steps. |
| One journey per `test()`          | No unrelated features mixed. Multi-state flows may use multiple steps within one test.                  |
| `meta()` on every test            | Domain tag + feature tag + suite tag (`SMOKE` or `REGRESSION`). JIRA when a ticket exists.              |
| No `test.only`                    | Blocked by CI (`forbidOnly`)                                                                            |
| No `waitForTimeout`               | Use element or URL waits with `timeouts` constants                                                      |
| No inline locators                | All `getBy…()` belong in the POM                                                                        |
| No hardcoded credentials / URLs   | Use `Env.EXISTING_STUDENT_EMAIL`, `Env.WEB_URL`, etc.                                                   |
| No `new PageClass(page)` in tests | Access via `ui.{domain}.{Class}` or alias                                                               |
| Shared setup in `beforeEach`      | Not repeated inside each `test()`                                                                       |
| Tests must be independent         | Each test sets up its own preconditions                                                                 |

---

## API Tests

```typescript
import { test, expect } from "tests/fixtures/merged.fixture";
import { meta, TAGS } from "utils/helpers/tags";
import { HttpMethod } from "utils/api/axios.client";

test(
  "returns a user for a valid ID",
  meta({ tags: [TAGS.EVOLVE_API, TAGS.SMOKE], jira: ["EDQAENG-12345"] }),
  async ({ api }) => {
    const res = await test.step("Act — GET /users/1", () =>
      api.uri("/users/1").send(HttpMethod.GET, false));
    await test.step("Assert — 200 + body", () => {
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(1);
    });
  },
);
```

- `api` is a single `RestClient`. Access directly: `api.uri(...)`.
- `send(method, false)` returns the raw response without throwing. Default `true` throws on non-2xx.
- Chain `.uri()`, `.addHeader()`, `.addQuery()`, `.addBody()` before `.send()`. Call `.uri()` once per send.
- `dispose()` is handled by the fixture — never call it manually.

---

## Tagging

```typescript
meta({ tags: [TAGS.EVOLVE, TAGS.LOGIN, TAGS.SMOKE], jira: ["EDQAENG-12345"] });
```

| Category | Required  | Examples                                                                 |
| -------- | --------- | ------------------------------------------------------------------------ |
| Domain   | ✅        | `TAGS.EVOLVE`, `TAGS.PS`, `TAGS.ADMIN`                                   |
| Feature  | ✅        | `TAGS.LOGIN`, `TAGS.CART`, `TAGS.CHECKOUT`                               |
| Suite    | ✅        | `TAGS.SMOKE` or `TAGS.REGRESSION`                                        |
| Special  | as needed | `TAGS.BUG` (skip retries) · `TAGS.SLOW` (15-min timeout, set by fixture) |

Always use the `TAGS` enum — never raw strings like `'@login'`.

---

## Timeouts

```typescript
import { timeouts } from "utils/helpers/timeouts";
await expect(el).toBeVisible({ timeout: timeouts.TEN_SECONDS });
```

`FIVE_SECONDS` · `TEN_SECONDS` · `THIRTY_SECONDS` · `ONE_MINUTE` · `FIFTEEN_MINUTES` (SLOW tests — set automatically by fixture).

Never use `page.waitForTimeout()` — replace with element or URL-based waits.

---

## DB Tests

- Helpers: `utils/db/` · Specs: `tests/specs/<domain>/db/`
- Connection setup/teardown in `beforeAll` / `afterAll`.
- DB assertions are the **Assert** step after an API or UI action — not standalone tests.

---

## Import Order

```typescript
// 1. Node built-ins
import path from "path";
// 2. Third-party
import { type Page } from "@playwright/test";
// 3. Env
import Env from "env/env.global";
// 4. Utils
import { logger } from "utils/helpers/logger";
import { timeouts } from "utils/helpers/timeouts";
// 5. Page objects / assertions
import { LoginPage } from "page-objects/pages/evolve/login.page";
```
