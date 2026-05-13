# POM Integration — Page Object Model Patterns

How to apply healed locators in TypeScript page object classes and Playwright fixtures.

---

## Core POM Class Pattern

```typescript
import { type Page, type Locator } from "@playwright/test";

export class LoginPage {
  // ── Locators ─────────────────────────────────────────────────────────────
  // Always readonly. Grouped by page section. Annotated with strategy used.

  // Section: Email step
  // ⭐⭐⭐⭐ label — snapshot: role=textbox name="Email address or username"
  readonly emailInput: Locator;

  // Section: Password step
  // ⭐⭐⭐⭐ role — snapshot: role=button name="Enter password"
  readonly passwordToggle: Locator;
  // ⭐⭐⭐⭐ label — snapshot: role=textbox name="Password"
  readonly passwordInput: Locator;

  // Section: Submit
  // ⭐⭐⭐⭐⭐ testid — confirmed: eval "el => el.dataset.testid" e4
  readonly signInButton: Locator;

  // Section: Error feedback
  // FRAGILE: no testid or role — CSS fallback; ask dev for data-testid="error-banner"
  readonly errorBanner: Locator;

  constructor(private readonly page: Page) {
    this.emailInput = page.getByLabel("Email address or username");
    this.passwordToggle = page.getByRole("button", { name: "Enter password" });
    this.passwordInput = page.getByLabel("Password");
    this.signInButton = page.getByTestId("sign-in-btn");
    this.errorBanner = page.locator(".alert-danger");
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  async goto(baseURL: string): Promise<void> {
    await this.page.goto(`${baseURL}/login`);
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  // Method names describe user intent, not implementation.

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordToggle.click();
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }

  async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  async getErrorMessage(): Promise<string | null> {
    if (await this.errorBanner.isVisible()) {
      return this.errorBanner.textContent();
    }
    return null;
  }
}
```

---

## Scoped Locators — Modal, Table Row, Form

Always scope to the narrowest meaningful container.

```typescript
// Modal dialog
export class ConfirmationModal {
  private readonly dialog = this.page.getByRole("dialog");
  readonly heading = this.dialog.getByRole("heading");
  readonly confirmBtn = this.dialog.getByRole("button", { name: "Confirm" });
  readonly cancelBtn = this.dialog.getByRole("button", { name: "Cancel" });

  constructor(private readonly page: Page) {}

  async confirm(): Promise<void> {
    await this.confirmBtn.click();
  }
}

// Table with row actions
export class UserTable {
  private readonly table = this.page.getByRole("table");

  constructor(private readonly page: Page) {}

  rowFor(userName: string): Locator {
    return this.table.locator("tr").filter({ hasText: userName });
  }

  async clickEdit(userName: string): Promise<void> {
    await this.rowFor(userName).getByRole("button", { name: "Edit" }).click();
  }

  async clickDelete(userName: string): Promise<void> {
    await this.rowFor(userName).getByRole("button", { name: "Delete" }).click();
  }
}

// Form scoped to avoid collisions when multiple forms exist
export class BillingForm {
  private readonly form = this.page.locator('[data-testid="billing-form"]');
  readonly firstName = this.form.getByLabel("First name");
  readonly lastName = this.form.getByLabel("Last name");
  readonly email = this.form.getByLabel("Email");
  readonly saveBtn = this.form.getByRole("button", { name: "Save" });

  constructor(private readonly page: Page) {}

  async fill(data: {
    firstName: string;
    lastName: string;
    email: string;
  }): Promise<void> {
    await this.firstName.fill(data.firstName);
    await this.lastName.fill(data.lastName);
    await this.email.fill(data.email);
  }
}
```

---

## or() Fallback — Gradual testid Adoption

Use `or()` when testids are being added progressively and you need the test to work before and after.

```typescript
// Accepts either the new testid or the old role locator
readonly submitButton = this.page
  .getByTestId('submit-btn')
  .or(this.page.getByRole('button', { name: 'Submit' }));

// Accepts either label (before/after copy change)
readonly emailInput = this.page
  .getByLabel('Email address')
  .or(this.page.getByLabel('Email'));
```

---

## FRAGILE Comment Convention

When you must use a CSS or text locator, always document it.

```typescript
// FRAGILE: no testid or role — CSS fallback
//   → request dev to add data-testid="error-banner" to <div class="alert-danger">
readonly errorBanner = this.page.locator('.alert-danger');

// FRAGILE: text may change — preferred if role becomes available
//   → when getByRole('link', { name: 'Forgot password?' }) works, use that instead
readonly forgotLink = this.page.getByText('Forgot your password?', { exact: true });

// XPath: last resort — third-party widget has no testid, role, or accessible label
//   → widget: Stripe card iframe uses shadow DOM with no outward aria attributes
readonly cardIcon = this.page.locator('xpath=//div[@data-icon="card"]');
```

---

## Fixture Pattern — Always Use merged.fixture

> **Rule:** All test specs — UI, API, and combined — must import from `tests/fixtures/merged.fixture`.
> Never import directly from `ui.fixture`, `api.fixture`, `combined.fixture`, or `@playwright/test`.

Page objects are pre-initialised by the `ui` fixture inside `merged.fixture`.
Access them via `ui.{domain}.{pageName}` — never instantiate them manually with `new PageClass(page)`.

```typescript
// tests/specs/evolve/ui/login.spec.ts
import { test, expect } from "../../../fixtures/merged.fixture";
import Env from "../../../../env/env.global";

test.describe("Login", () => {
  test("redirects to dashboard with valid credentials", async ({ ui }) => {
    await ui.evolve.loginPage.goto(Env.WEB_URL);
    await ui.evolve.loginPage.login(
      Env.EXISTING_STUDENT_EMAIL,
      Env.COMMON_PASSWORD,
    );
    await expect(ui.evolve.loginPage.elements.dashboard()).toBeVisible();
  });

  test("shows error for invalid credentials", async ({ ui }) => {
    await ui.evolve.loginPage.goto(Env.WEB_URL);
    await ui.evolve.loginPage.login("bad@example.com", "wrongpassword");
    await expect(ui.evolve.loginPage.elements.errorBanner()).toBeVisible();
  });
});
```

```typescript
// tests/specs/evolve/api/users.spec.ts  (API test — still uses merged.fixture)
import { test, expect } from "../../../fixtures/merged.fixture";
import Env from "../../../../env/env.global";

test.describe("Users API", () => {
  test("returns 200 for authenticated user list request", async ({ api }) => {
    const response = await api.get("/users", {
      type: "bearer",
      token: Env.API_TOKEN ?? "",
    });
    expect(response.status).toBe(200);
  });
});
```

### Group-specific setup — extend merged.fixture locally

When tests in a group share non-trivial setup (e.g. a pre-logged-in session), extend
`merged.fixture` locally rather than repeating logic in every `test()`:

```typescript
// tests/specs/evolve/ui/dashboard.spec.ts
import { test as base, expect } from "../../../fixtures/merged.fixture";
import Env from "../../../../env/env.global";

const test = base.extend<{ loggedIn: void }>({
  loggedIn: async ({ ui }, use) => {
    await ui.evolve.loginPage.goto(Env.WEB_URL);
    await ui.evolve.loginPage.login(
      Env.EXISTING_STUDENT_EMAIL,
      Env.COMMON_PASSWORD,
    );
    await use();
  },
});

test.describe("Dashboard", () => {
  test("shows welcome message after login", async ({ ui, loggedIn }) => {
    await expect(
      ui.evolve.dashboardPage.elements.welcomeHeading(),
    ).toBeVisible();
  });
});
```

---

## Real-World Example: Evolve Platform Login Page

Based on live playwright-cli inspection:

```
playwright-cli open https://app.evolve.com/login
playwright-cli snapshot

Snapshot output:
  e1 [role=textbox] [name="Email address or username"]
  e2 [role=button]  [name="Enter password"]
  e3 [role=textbox] [name="Password"]                   ← hidden until e2 clicked
  e4 [role=button]  [name="Sign In"]
  e5 [role=link]    [name="Forgot username or password?"]
  e6 [role=link]    [name="Create an account."]
```

```typescript
export class EvolveLoginPage {
  // ⭐⭐⭐⭐ label — e1: role=textbox name="Email address or username"
  readonly emailInput = this.page.getByLabel("Email address or username");
  // ⭐⭐⭐⭐ role — e2: role=button name="Enter password"
  readonly passwordToggle = this.page.getByRole("button", {
    name: "Enter password",
  });
  // ⭐⭐⭐⭐ label — e3: role=textbox name="Password"
  readonly passwordInput = this.page.getByLabel("Password");
  // ⭐⭐⭐⭐ role — e4: role=button name="Sign In"
  readonly signInButton = this.page.getByRole("button", { name: "Sign In" });
  // ⭐⭐⭐⭐ role — e5: role=link name="Forgot username or password?"
  readonly forgotLink = this.page.getByRole("link", {
    name: "Forgot username or password?",
  });

  constructor(private readonly page: Page) {}

  async goto(baseURL: string): Promise<void> {
    await this.page.goto(`${baseURL}/login`);
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordToggle.click();
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }
}
```

---

## Rules for POM Classes

- All locators are `readonly` properties — never recreated per method call.
- Locators are defined in the `constructor`, not in methods.
- Methods describe user intent (`login`, `submitOrder`) not actions (`clickButton`).
- Each page or significant component gets its own class file in `page-objects/pages/{domain}/`.

### Two-tier method pattern

Every element interaction must have its own **tier-1 action method**. Compound methods must compose tier-1 methods — never inline locator calls inside them.

```typescript
// ✅ Tier 1 — one method per interaction
async fillEmail(email: string): Promise<void> {
  await this.elements.emailInput().fill(email);
}

async clickSignIn(): Promise<void> {
  await this.elements.signInButton().click();
}

// ✅ Tier 2 — compound method composes tier-1 methods
async login(email: string, password: string): Promise<void> {
  await this.fillEmail(email);
  await this.clickLoginWithPassword();
  await this.fillPassword(password);
  await this.clickSignIn();
}

// ❌ Bad — compound method inlines locator calls directly
async login(email: string, password: string): Promise<void> {
  await this.elements.emailInput().fill(email);         // should be fillEmail()
  await this.elements.signInButton().click();           // should be clickSignIn()
}
```

### No `test.step()` in POM methods

POM methods are shared across many tests, each of which may group steps differently. Embedding `test.step()` inside a POM method locks the step label for every caller and corrupts the report structure.

```typescript
// ❌ Bad — step label hard-coded inside POM
async login(email: string, password: string): Promise<void> {
  await test.step('Fill email and sign in', async () => {
    await this.fillEmail(email);
    await this.clickSignIn();
  });
}

// ✅ Good — steps belong in the spec
test('logs in successfully', async ({ ui }) => {
  await test.step('Act — sign in', async () => {
    await ui.evolve.loginPage.login(Env.USER_EMAIL, Env.USER_PASSWORD);
  });
});
```

### No scenario-flow methods in POM

A method that strings together a full test scenario (multiple unrelated intents + assertions) belongs in the spec, not the POM. Tests that need a different sub-sequence cannot reuse a hardcoded flow method.

```typescript
// ❌ Bad — encodes a fixed test scenario with assertions mixed in
async runLoginFlow(email: string): Promise<void> {
  await this.fillEmail(email);
  await this.clickSendPasscode();
  await this.verifyOtpSentState();          // assertion — belongs in spec
  await this.clickLoginWithPassword();
  await this.verifyPasswordLoginState();    // assertion — belongs in spec
}

// ✅ Good — individual methods; the spec composes the scenario
// In the spec:
await ui.evolve.loginPage.fillEmail(email);
await ui.evolve.loginPage.clickSendPasscode();
await expect(ui.evolve.loginPage.elements.otpSentMessage()).toBeVisible();
await ui.evolve.loginPage.clickLoginWithPassword();
await expect(ui.evolve.loginPage.elements.passwordInput()).toBeEnabled();
```

### No direct locator calls in specs

**Spec files must never contain element locating or direct interaction code.** Any Playwright locator API — `page.locator()`, `page.getByRole()`, `page.getByLabel()`, `page.getByTestId()`, `page.getByText()`, `page.getByPlaceholder()` — or any chained action (`.click()`, `.fill()`, `.type()`, `.press()`) is forbidden inside a spec file and must live in a POM class method.

- ❌ `page.getByRole('button', { name: 'Sign In' }).click();` — in a spec
- ✅ `await ui.evolve.loginPage.clickSignIn();` — delegates to POM

- Add a `// FRAGILE:` comment whenever you use a CSS or text locator.
- Add a strategy comment on each locator (`// ⭐⭐⭐⭐ label — confirmed via snapshot`).
