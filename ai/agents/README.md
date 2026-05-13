# ai/agents

AI agent prompt files for orchestrating automation tasks in this Playwright + Axios framework.
Each agent is a Markdown file containing role definition, inputs, rules, and output format
that guides an AI assistant to perform a specific task.

---

## Agent Overview

```
orchestrator.agent
  ├── pom-designer.agent      → creates page object classes
  ├── script-designer.agent   → writes test specs from test steps
  ├── code-review.agent       → reviews code and PRs
  └── code-refactor.agent     → cleans up and improves existing code
```

## Files

| File                                                            | Role                                                                                                                                              |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| [orchestrator.agent.md](orchestrator.agent.md)                  | Main controller — receives a high-level task and delegates to the right sub-agents in the correct order                                           |
| [pom-designer.agent.md](sub-agents/pom-designer.agent.md)       | Creates a TypeScript page class in `page-objects/pages/` using the locator strategy priority from `ai/skills/playwright-locator-healing/SKILL.md` |
| [script-designer.agent.md](sub-agents/script-designer.agent.md) | Turns plain-English or Gherkin test steps into a `.spec.ts` file following project fixtures and POM patterns                                      |
| [code-review.agent.md](sub-agents/code-review.agent.md)         | Reviews local files or a PR for locator quality, POM structure, fixture usage, and general code standards                                         |
| [code-refactor.agent.md](sub-agents/code-refactor.agent.md)     | Refactors existing code to fix locators, extract POMs, clean up fixtures, and remove duplication — without changing test behaviour                |

---

## How to Use

### Start with the orchestrator for any task

Tell `orchestrator.agent` what you need:

```
TASK: Create a test for the checkout flow
CONTEXT:
  Steps:
    1. Go to /checkout
    2. Fill in the address form
    3. Click Place Order
    4. Verify the confirmation page shows order number
```

The orchestrator decides the order:

1. Does a `CheckoutPage` POM exist? No → invoke **pom-designer.agent**
2. POM ready → invoke **script-designer.agent**
3. Script ready → invoke **agent.code-review** before PR

### Use a sub-agent directly for focused tasks

```
# Review a PR before merging
agent.code-review  →  MODE: pr  /  TARGET: #42

# Refactor a page that uses XPath
agent.code-refactor  →  TARGET: page-objects/pages/evolve/login.page.ts

# Create a page class for a new page
agent.pom-designer  →  PAGE NAME: Dashboard  /  DOMAIN: evolve  /  URL: ...
```

---

## Orchestrator Decision Rules

| Task type                      | Agents invoked (in order)                    |
| ------------------------------ | -------------------------------------------- |
| Create a new test (no POM yet) | pom-designer → script-designer → code-review |
| Create a new test (POM exists) | script-designer → code-review                |
| Review code / PR               | code-review                                  |
| Refactor then verify           | code-refactor → code-review                  |
| Create a page class only       | pom-designer                                 |

---

## Related Skills

These skill files are referenced by the agents above:

| Skill                                                                                                | Used by                                                    |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| [ai/skills/playwright-locator-healing/SKILL.md](../skills/playwright-locator-healing/SKILL.md)       | agent.pom-designer, agent.code-review, agent.code-refactor |
| [ai/skills/playwright-locator-healing/references/](../skills/playwright-locator-healing/references/) | agent.pom-designer (deep reference docs)                   |

---

## Angular Auto-Wait — Never Call `waitForAngularLoad` in POM Methods

**Rule:** POM action methods must **not** call `waitForAngularLoad`. The `ui` fixture patches every
Playwright Locator returned by `page.getByRole`, `page.getByLabel`, `page.locator`, etc. to
automatically call `waitForAngularLoad` after these action methods:

`click` · `fill` · `selectOption` · `check` · `uncheck` · `tap` · `type` · `pressSequentially` · `clear` · `dragTo`

The `page.goto` patch also auto-waits after every navigation.

### What this means for page objects

```typescript
// ❌ Before — manual wait (now redundant, causes double-wait)
async fillEmail(email: string): Promise<void> {
  await this.elements.emailInput().fill(email);
  await waitForAngularLoad(this.page);   // ← remove this
}

// ✅ After — fixture handles it automatically
async fillEmail(email: string): Promise<void> {
  await this.elements.emailInput().fill(email);
}
```

Agents must apply this rule during every phase: **POM design**, **script generation**, **code review**, and **refactoring**.

---

## Dismiss / Bypass Actions — Always Use `ui.fixture`

**Rule:** Any action that dismisses, bypasses, or suppresses a UI blocker (cookie banners, consent modals, overlays) must be implemented in `tests/fixtures/ui.fixture.ts` — never inline in a spec or `beforeEach`.

### What is already covered

`ui.fixture` currently bypasses the **OneTrust cookie consent banner** by injecting two cookies before the test starts:

| Cookie                  | Purpose                               |
| ----------------------- | ------------------------------------- |
| `OptanonAlertBoxClosed` | Marks the banner as already dismissed |
| `OptanonConsent`        | Records full consent given            |

### When to add a new dismiss to `ui.fixture`

When **designing**, **refactoring**, **adding**, or **creating** test cases — if a page shows any blocker that must be dismissed for tests to proceed (cookie banner, GDPR overlay, chat widget, etc.), add the bypass to `ui.fixture` so it applies automatically to every test.

**Do not:**

- Handle dismiss actions inside individual tests or `beforeEach` blocks
- Duplicate cookie-injection logic across multiple spec files

**Do:**

- Add the new cookie or dismiss action to the `ui` fixture in `tests/fixtures/ui.fixture.ts`
- Reference `context.addCookies([...])` for cookie-based bypasses (follow the OneTrust pattern already in the file)

Agents must apply this rule during every phase: **POM design**, **script generation**, **code review**, and **refactoring**.
