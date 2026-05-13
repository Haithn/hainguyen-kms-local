---
name: playwright-locator-healing
description: "Expert locator healing skill for repairing, discovering, and optimizing web element locators for Playwright automation. Use when: fixing broken selectors, locating elements on a live page, improving locator robustness, healing flaky tests, updating locators after UI changes, or writing new POM classes. Uses playwright-cli to inspect live pages and validate locators before writing code."
---

# Playwright Locator Healing Skill

## What This Skill Does

Uses **playwright-cli** to open a live browser, read the DOM via snapshots, and discover
the strongest locator for each element — then apply it in TypeScript page objects.

Two phases:

1. **Discover** — open a real browser, read snapshots, confirm with `run-code`
2. **Apply** — write the validated locator in the TypeScript POM

---

## Locator Strategy Priority

Always try in this order. Stop at the first one that uniquely matches.

```
1. data-testid     ⭐⭐⭐⭐⭐   getByTestId('name')
2. ARIA role       ⭐⭐⭐⭐    getByRole('button', { name: 'Submit' })
3. Label           ⭐⭐⭐⭐    getByLabel('Email address')
4. Placeholder     ⭐⭐⭐     getByPlaceholder('Enter email')
5. Text            ⭐⭐      getByText('Forgot password')
6. CSS selector    ⭐⭐      locator('.submit-btn')
7. XPath           ⭐        locator('xpath=...')
```

→ Full detail on each strategy: [references/locator-strategies.md](references/locator-strategies.md)

---

## Phase 1 — Discover with playwright-cli

### Step 1: Open the page

```bash
playwright-cli open https://your-app.com/page

# Authenticated pages — load session first
playwright-cli state-load auth.json
playwright-cli open https://your-app.com/dashboard
```

### Step 2: Snapshot — your element map

```bash
playwright-cli snapshot
```

Snapshot lists every element with a ref (`e1`, `e5`…), its role, accessible name, and attributes.

| Snapshot shows                      | Use this locator                              |
| ----------------------------------- | --------------------------------------------- |
| `[data-testid="login-btn"]`         | `getByTestId('login-btn')`                    |
| `role=button name="Submit"`         | `getByRole('button', { name: 'Submit' })`     |
| `role=textbox name="Email address"` | `getByLabel('Email address')`                 |
| `placeholder="Enter email"`         | `getByPlaceholder('Enter email')`             |
| Unique text, no role/testid         | `getByText('...', { exact: true })` + FRAGILE |
| None of the above                   | CSS or XPath + FRAGILE/XPath comment          |

### Step 3: Inspect an element's attributes

```bash
playwright-cli eval "el => el.outerHTML" e5
playwright-cli eval "el => el.dataset.testid" e5
playwright-cli eval "el => el.getAttribute('aria-label')" e5
playwright-cli eval "el => el.closest('label')?.textContent?.trim()" e5
```

→ Full eval recipes: [scripts/eval-toolkit.md](scripts/eval-toolkit.md)

### Step 4: Validate the locator (count must === 1)

```bash
playwright-cli run-code "async page => {
  const el = page.getByRole('button', { name: 'Submit' });
  console.log('count:', await el.count());
  console.log('visible:', await el.isVisible());
}"
```

### Step 5: Resolve ambiguous locators (count > 1)

```bash
# Scope inside a parent
playwright-cli run-code "async page => {
  const form = page.locator('[data-testid=\"login-form\"]');
  console.log('count:', await form.getByRole('button', { name: 'Submit' }).count());
}"

# Filter by text
playwright-cli run-code "async page => {
  console.log('count:', await page.getByRole('button').filter({ hasText: 'Submit' }).count());
}"
```

→ Special cases (iframe, shadow DOM, async, web components): [references/special-cases.md](references/special-cases.md)

---

## Phase 2 — Apply the Healed Locator

### Snapshot finding → TypeScript

| What snapshot / eval showed  | TypeScript                                            |
| ---------------------------- | ----------------------------------------------------- |
| `data-testid="login-btn"`    | `page.getByTestId('login-btn')`                       |
| `role=button name="Submit"`  | `page.getByRole('button', { name: 'Submit' })`        |
| label text `"Email address"` | `page.getByLabel('Email address')`                    |
| `placeholder="Enter email"`  | `page.getByPlaceholder('Enter email')`                |
| Unique text, no role         | `page.getByText('Forgot password?', { exact: true })` |
| Stable CSS class             | `page.locator('.alert-banner')`                       |
| Nothing else                 | `page.locator('xpath=...')`                           |

### POM class (project style)

- Locators are **lambda properties** inside an `elements` object — no inline comments on locators
- Constructor is `protected`
- No section header comments (`// ── Navigation`, `// ── Actions`, etc.)
- Public methods get **JSDoc** with `@param` tags; private/internal helpers do not

```typescript
import { type Page } from "@playwright/test";

export class LoginPage {
  elements = {
    loginButton: () => this.page.getByTestId("login-btn"),
    emailInput: () => this.page.getByLabel("Email address"),
    // FRAGILE: no testid/role — ask dev to add data-testid="error-msg"
    errorMessage: () => this.page.locator(".alert-danger"),
  };

  constructor(protected page: Page) {}

  /**
   * Navigates to the login page.
   * @param baseURL - Application base URL
   */
  async goto(baseURL: string): Promise<void> {
    await this.page.goto(`${baseURL}/login`);
  }

  /**
   * Completes the login flow end-to-end.
   * @param email - Email address or username
   * @param password - Account password
   */
  async login(email: string, password: string): Promise<void> {
    await this.elements.emailInput().fill(email);
    await this.elements.loginButton().click();
  }
}
```

The only comment allowed on a locator is `// FRAGILE:` when no testid/role is available.

→ Full POM patterns, scoping, fixtures: [references/pom-integration.md](references/pom-integration.md)

---

## Healing Workflow (End-to-End)

```bash
# 1. Open the page
playwright-cli open https://app.example.com/login

# 2. See the current DOM
playwright-cli snapshot

# 3. Inspect the changed element (e.g. label text changed)
playwright-cli eval "el => el.closest('label')?.textContent?.trim()" e4
# → "Email address"  (was "Email")

# 4. Validate
playwright-cli run-code "async page => {
  console.log('count:', await page.getByLabel('Email address').count());
}"
playwright-cli close

# 5. Update the POM
#   Before: this.emailInput = page.getByLabel('Email');
#   After:  this.emailInput = page.getByLabel('Email address');
```

→ All Before/After patterns: [references/healing-patterns.md](references/healing-patterns.md)
→ Debugging failures: [references/debugging.md](references/debugging.md)

---

## Quick Reference

| Goal                       | Command                                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Open page                  | `playwright-cli open <url>`                                                                                  |
| Load auth session          | `playwright-cli state-load auth.json`                                                                        |
| See all elements + refs    | `playwright-cli snapshot`                                                                                    |
| Read element HTML          | `playwright-cli eval "el => el.outerHTML" e5`                                                                |
| Read data-testid           | `playwright-cli eval "el => el.dataset.testid" e5`                                                           |
| Read label text            | `playwright-cli eval "el => el.closest('label')?.textContent?.trim()" e5`                                    |
| Validate locator count     | `playwright-cli run-code "async page => { console.log(await page.getByRole('button',{name:'X'}).count()) }"` |
| Interact to reveal element | `playwright-cli click e3` → `playwright-cli snapshot`                                                        |
| Close browser              | `playwright-cli close`                                                                                       |

→ Full eval + run-code snippet library: [references/eval-toolkit.md](references/eval-toolkit.md)

---

## Rules

1. **Never take screenshots** — do not run `playwright-cli screenshot` at any point. Use `playwright-cli snapshot` to read the DOM.
2. Validate every locator with `run-code` (count === 1) before writing TypeScript.
3. Never use "Copy XPath" / "Copy selector" from DevTools — always use the strategy priority.
4. If count > 1, scope inside a parent container before falling to a lower strategy.
5. No testid + no role/label → add `// FRAGILE:` comment and request `data-testid` from dev.
6. Healed locators go in the POM class — never inline in spec files.
7. Never use `page.waitForTimeout(ms)` — replace with element or URL wait.
8. XPath only when unavoidable — always add `// XPath: <reason>` comment.

---

## References

- **Locator strategies** — full detail, advantages, disadvantages, migration guide, performance [references/locator-strategies.md](references/locator-strategies.md)
- **Healing patterns** — Before/After catalogue for all common breakage scenarios [references/healing-patterns.md](references/healing-patterns.md)
- **Special cases** — iframe, shadow DOM, async content, web components, overlays [references/special-cases.md](references/special-cases.md)
- **POM integration** — class design, scoping, fixture pattern, real-world examples [references/pom-integration.md](references/pom-integration.md)
- **Debugging** — playwright-cli console/network/trace + TypeScript inspector, symptom table [references/debugging.md](references/debugging.md)
- **Eval toolkit** — copy-paste eval + run-code snippets for locator inspection [references/eval-toolkit.md](references/eval-toolkit.md)
