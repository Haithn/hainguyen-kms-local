# Project Conventions

Canonical rules for this Playwright + Axios framework.  
All agents and skills under `ai/` must follow these conventions and must be kept in sync whenever a convention changes.

---

## Keeping `ai/` Up to Date

**Rule:** Whenever a framework-level behaviour changes — a new fixture patch, a new wait strategy, a
new bypass, a new locator convention, etc. — the following files **must be updated in the same
change**:

| File                                 | What to update                                         |
| ------------------------------------ | ------------------------------------------------------ |
| `ai/convention.md` (this file)       | Add / update the relevant convention section           |
| `ai/agents/README.md`                | Add / update the relevant shared rule block            |
| `ai/agents/agent.pom-designer.md`    | Update Phase 4 rules and the Rules list                |
| `ai/agents/agent.code-review.md`     | Add / update the relevant checklist row                |
| `ai/agents/agent.code-refactor.md`   | Add / update the relevant priority table               |
| `ai/agents/agent.orchestrator.md`    | Update delegation reminders if the rule affects output |
| Affected skill files in `ai/skills/` | Update examples and guidance to match                  |

A change is **not complete** until every file in the list above reflects it.

---

## 1. Angular Auto-Wait

**Source:** `tests/fixtures/ui.fixture.ts` — `patchPageForAngular(page)`

The `ui` fixture wraps every Playwright Locator returned by `page.getByRole`, `page.getByLabel`,
`page.locator`, etc. to automatically call `waitForAngularLoad` after each of these actions:

`click` · `fill` · `selectOption` · `check` · `uncheck` · `tap` · `type` ·
`pressSequentially` · `clear` · `dragTo`

The `page.goto` patch additionally auto-waits after every full-page navigation.

### What to do

- **POM action methods must not call `waitForAngularLoad` manually.** Doing so causes a
  redundant double-wait.
- Remove the `import { waitForAngularLoad } ...` line from any POM file once all manual calls
  are removed.

```typescript
// ❌ Redundant — fixture already waits
async fillEmail(email: string): Promise<void> {
  await this.elements.emailInput().fill(email);
  await waitForAngularLoad(this.page);
}

// ✅ Correct
async fillEmail(email: string): Promise<void> {
  await this.elements.emailInput().fill(email);
}
```

### Covered action methods (locator-level)

`click`, `fill`, `selectOption`, `check`, `uncheck`, `tap`, `type`, `pressSequentially`,
`clear`, `dragTo`

### Covered page-level methods

`click`, `fill`, `check`, `uncheck`, `selectOption`, `tap`, `type`

### Covered navigation

`page.goto` — patched to call `waitForAngularLoad` after every navigation

---

## 2. Dismiss / Bypass Actions — Always Use `ui.fixture`

**Source:** `tests/fixtures/ui.fixture.ts` — `context.addCookies([...])`

Any action that dismisses, bypasses, or suppresses a UI blocker (cookie banners, consent modals,
overlays) must be implemented in `tests/fixtures/ui.fixture.ts` — never inline in a spec or
`beforeEach`.

### Currently covered

| Cookie                  | Purpose                                        |
| ----------------------- | ---------------------------------------------- |
| `OptanonAlertBoxClosed` | Marks the OneTrust banner as already dismissed |
| `OptanonConsent`        | Records full consent given                     |

### When to add a new bypass

Add a cookie or dismiss action to the `ui` fixture when a new blocker is encountered during POM
design, script generation, or refactoring. Follow the `context.addCookies([...])` pattern already
in the file.

---

## 3. Test Import — Always `merged.fixture`

All test specs (UI, API, combined) must import `test` and `expect` from
`tests/fixtures/merged.fixture` — never directly from `ui.fixture`, `api.fixture`, or
`combined.fixture`.

```typescript
// ✅ Correct
import { test, expect } from "tests/fixtures/merged.fixture";

// ❌ Wrong
import { test } from "tests/fixtures/ui.fixture";
```

---

## 4. No Direct Locating in Spec Files

Any Playwright locator API call or action chain must live in a POM class method — never inline in a
spec file.

```typescript
// ❌ Wrong — locator in spec
await page.getByRole("button", { name: "Sign In" }).click();

// ✅ Correct — spec calls a named POM method
await ui.evolve.loginPage.clickSignIn();
```

---

## 5. POM Two-Tier Method Pattern

Every element interaction must have its own named tier-1 method. Compound methods compose tier-1
methods — they never inline locator calls directly.

```typescript
// Tier 1
async fillEmail(email: string) { await this.elements.emailInput().fill(email); }
async clickSignIn()            { await this.elements.signInButton().click(); }

// Tier 2
async login(email: string, password: string) {
  await this.fillEmail(email);
  await this.clickSignIn();
}
```

---

## 6. No `test.step()` Inside POM Methods

Step labels belong in the spec, not in the page class. POMs are reused across tests with
different step structures — embedding steps fixes that structure.

```typescript
// ❌ Wrong
async login(...) { await test.step('Fill email', () => this.fillEmail(email)); }

// ✅ Correct
async login(...) { await this.fillEmail(email); ... }
```
