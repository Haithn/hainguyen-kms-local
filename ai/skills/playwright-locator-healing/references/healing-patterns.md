# Healing Patterns — Before/After Catalogue

Complete reference of common locator breakage scenarios with discovery steps and fixes.
Each pattern follows: **Problem → Discovery → Before → After → Why it works**.

---

## Pattern 1: XPath Positional → Role (Most Common)

**Problem:** XPath breaks whenever the DOM is restructured.

**Discovery:**

```bash
playwright-cli snapshot
# Find the element by its visible text or position on the page
playwright-cli eval "el => ({ tag: el.tagName, text: el.textContent?.trim(), role: el.getAttribute('role') })" e4
```

```typescript
// ❌ Before
page.locator("xpath=//form/div[2]/button[1]");

// ✅ After — snapshot showed: role=button name="Sign In"
page.getByRole("button", { name: "Sign In" });
```

**Why:** Role locators use the accessibility tree, not DOM position — immune to restructuring.

---

## Pattern 2: XPath Text → Role with Name

**Problem:** `contains(text(), ...)` breaks on whitespace changes or partial rewords.

**Discovery:**

```bash
playwright-cli eval "el => el.textContent?.trim()" e6
playwright-cli eval "el => el.getAttribute('aria-label') ?? el.textContent?.trim()" e6
```

```typescript
// ❌ Before
page.locator('xpath=//button[contains(text(), "Submit")]');

// ✅ After
page.getByRole("button", { name: "Submit" });
```

**Why:** `getByRole` with `name` matches the accessible name, which is stable and precise.

---

## Pattern 3: Generated CSS Class → testid or Label

**Problem:** CSS-in-JS frameworks regenerate class hashes on every build.

**Discovery:**

```bash
playwright-cli eval "el => el.dataset.testid" e5
playwright-cli eval "el => el.closest('label')?.textContent?.trim() ?? el.getAttribute('aria-label')" e5
```

```typescript
// ❌ Before — breaks on every rebuild
page.locator(".css-1a2b3c4d");

// ✅ After option A — testid found via eval
page.getByTestId("email-input");

// ✅ After option B — label found via snapshot
page.getByLabel("Email address");
```

**Why:** testid and labels are stable contracts; generated class names are implementation details.

---

## Pattern 4: nth-child Positional → Scoped Filter

**Problem:** Row/item index breaks whenever the list order changes.

**Discovery:**

```bash
playwright-cli snapshot
# Find what unique text or attribute identifies the target row
playwright-cli eval "el => el.textContent?.trim()" e8
```

```typescript
// ❌ Before — breaks when rows reorder
page.locator("table tr:nth-child(3) button");

// ✅ After — find row by content, button by role within it
page
  .locator("tr")
  .filter({ hasText: "John Doe" })
  .getByRole("button", { name: "Edit" });

// ✅ After (if row has testid)
page
  .locator('[data-testid="user-row"]')
  .filter({ hasText: "John Doe" })
  .getByRole("button", { name: "Edit" });
```

**Why:** Filtering by content is stable; positional selectors are tied to DOM order.

---

## Pattern 5: Text Selector → Role

**Problem:** `text=` selectors break on copy changes, translations, or A/B tests.

**Discovery:**

```bash
playwright-cli snapshot
# Role is listed alongside element name in snapshot output
```

```typescript
// ❌ Before
page.locator("text=Submit");
page.locator(':has-text("Forgot password")');

// ✅ After
page.getByRole("button", { name: "Submit" });
page.getByRole("link", { name: "Forgot password?" });
```

**Why:** Role + name targets the semantic element, not the raw string in the DOM.

---

## Pattern 6: Global Locator Collision → Scoped

**Problem:** Multiple elements share the same role/text (e.g. two "Submit" buttons), causing `count > 1`.

**Discovery:**

```bash
playwright-cli run-code "async page => {
  console.log('count:', await page.getByRole('button', { name: 'Confirm' }).count());
}"
# If count > 1, scope to a parent
playwright-cli run-code "async page => {
  const dialog = page.getByRole('dialog');
  console.log('scoped count:', await dialog.getByRole('button', { name: 'Confirm' }).count());
}"
```

```typescript
// ❌ Before — matches buttons outside the modal too
page.getByRole("button", { name: "Confirm" });

// ✅ After — scoped to the dialog
page.getByRole("dialog").getByRole("button", { name: "Confirm" });

// ✅ After — scoped to a form
page
  .locator('[data-testid="billing-form"]')
  .getByRole("button", { name: "Save" });
```

**Why:** Scoping chains narrow the search space to a specific container.

---

## Pattern 7: Flaky Race Condition → Explicit Wait

**Problem:** Element exists but is not yet interactive when the test runs.

**Discovery:**

```bash
playwright-cli run-code "async page => {
  await page.waitForLoadState('networkidle');
  const el = page.getByTestId('result');
  await el.waitFor({ state: 'visible', timeout: 5000 });
  console.log('visible:', await el.isVisible());
}"
```

```typescript
// ❌ Before — race condition
await page.locator('[data-testid="result"]').click();

// ✅ After — wait for visibility first
const result = page.getByTestId("result");
await result.waitFor({ state: "visible" });
await result.click();

// ✅ After — for content loaded via API
await page.waitForLoadState("networkidle");
await page.getByTestId("result").click();
```

**Why:** Playwright auto-waits for actionability but not always for elements to enter the DOM.

---

## Pattern 8: Label Text Changed

**Problem:** The label copy changed (e.g. "Email" → "Email address") — locator returns count 0.

**Discovery:**

```bash
playwright-cli open https://app.example.com/login
playwright-cli snapshot
playwright-cli eval "el => el.closest('label')?.textContent?.trim()" e4
# Output: "Email address"
```

```typescript
// ❌ Before
page.getByLabel("Email");

// ✅ After — updated to match current label text
page.getByLabel("Email address");
```

**Why:** `getByLabel` performs an exact text match against the associated label.

---

## Pattern 9: Dynamic ID → testid or Label

**Problem:** IDs are generated at runtime (e.g. `id="input-1234"`), changing per session.

**Discovery:**

```bash
playwright-cli eval "el => ({ id: el.id, testid: el.dataset.testid, label: el.getAttribute('aria-label') })" e5
```

```typescript
// ❌ Before — dynamic ID breaks across sessions
page.locator("#input-1234");

// ✅ After
page.getByTestId("email-input");
// or
page.getByLabel("Email address");
```

**Why:** Dynamic IDs are not stable identifiers; semantic attributes are.

---

## Pattern 10: Aria-Hidden Overlay Blocking Interaction

**Problem:** An overlay or spinner covers the element — Playwright throws "element is not visible".

**Discovery:**

```bash
playwright-cli console error       # check for JS errors
playwright-cli screenshot --filename=blocked.png   # see what's covering the element
playwright-cli run-code "async page => {
  await page.waitForSelector('[data-testid=\"spinner\"]', { state: 'hidden' });
  console.log('spinner gone');
}"
```

```typescript
// ❌ Before — click attempted while spinner is visible
await page.getByRole("button", { name: "Submit" }).click();

// ✅ After — wait for overlay to disappear first
await page.getByTestId("loading-spinner").waitFor({ state: "hidden" });
await page.getByRole("button", { name: "Submit" }).click();
```

**Why:** Playwright respects visibility — it won't click an element covered by another.

---

## Pattern 11: Text Translation / i18n

**Problem:** Tests use hardcoded English text that breaks in other locales.

**Discovery:**

```bash
playwright-cli eval "el => el.getAttribute('data-testid') ?? el.getAttribute('aria-label')" e5
```

```typescript
// ❌ Before — breaks in non-English environments
page.getByText("Submit");
page.getByRole("button", { name: "Submit" });

// ✅ After option A — use testid (locale-independent)
page.getByTestId("submit-button");

// ✅ After option B — use aria-label set in code (locale-independent)
page.getByLabel("submit-action");
```

**Why:** `data-testid` and programmatic `aria-label` values are set by developers and not translated.
