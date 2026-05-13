# Special Cases — Locators in Complex Scenarios

Covers locator discovery and TypeScript patterns for elements that are not in the main document.
Each case includes: playwright-cli discovery → TypeScript locator.

---

## 1. Element Inside an iframe

Playwright does **not** automatically cross into iframes — you must use `frameLocator()`.

**Discovery:**

```bash
# Find the iframe's selector first
playwright-cli eval "el => ({ src: el.src, title: el.title, id: el.id, name: el.name })" e2

# Then validate the locator inside the frame
playwright-cli run-code "async page => {
  const frame = page.frameLocator('iframe[title=\"Payment\"]');
  const el = frame.getByLabel('Card number');
  console.log('count:', await el.count());
}"
```

**TypeScript:**

```typescript
// Standard iframe by title
const frame = page.frameLocator('iframe[title="Payment"]');
const cardInput = frame.getByLabel("Card number");

// iframe by src pattern
const frame = page.frameLocator('iframe[src*="/payment"]');

// Nested iframes
const inner = page.frameLocator("iframe#outer").frameLocator("iframe#inner");
const el = inner.getByTestId("target");

// Full page object pattern
export class PaymentFrame {
  private readonly frame = this.page.frameLocator('iframe[title="Payment"]');
  readonly cardNumber = this.frame.getByLabel("Card number");
  readonly expiry = this.frame.getByLabel("Expiry date");
  readonly cvv = this.frame.getByLabel("Security code");

  constructor(private readonly page: Page) {}
}
```

---

## 2. Shadow DOM

Playwright **automatically pierces open shadow roots** with standard locators (CSS, role, label).
No special handling needed for open shadow DOM.

**Discovery:**

```bash
# Test if Playwright can reach it without any special handling
playwright-cli run-code "async page => {
  const el = page.getByLabel('Card number');
  console.log('count:', await el.count());
}"

# If count 0, try CSS piercing explicitly
playwright-cli run-code "async page => {
  const el = page.locator('my-card-component input[name=\"card\"]');
  console.log('count:', await el.count());
}"
```

**TypeScript:**

```typescript
// Open shadow DOM — standard locators work directly
const input = page.getByLabel("Card number");

// CSS piercing if semantic locators fail
const input = page.locator('my-card-component input[name="card"]');

// Explicit shadow piercing (older Playwright versions)
const input = page.locator('my-card-component >> css=input[type="text"]');
```

**Note:** Closed shadow roots (`attachShadow({ mode: 'closed' })`) cannot be pierced — contact the dev team.

---

## 3. Element Revealed After Interaction

Elements that only appear after a click, hover, or keyboard event.

**Discovery:**

```bash
# Interact first, then snapshot to see new elements
playwright-cli click e3
playwright-cli snapshot

# Or hover to reveal
playwright-cli hover e5
playwright-cli snapshot

# Inspect the newly revealed element
playwright-cli eval "el => el.outerHTML" e9
playwright-cli eval "el => el.dataset.testid" e9
```

**TypeScript:**

```typescript
// Dropdown revealed after click
await page.getByRole("button", { name: "Options" }).click();
const dropdown = page.getByRole("menu");
await dropdown.getByRole("menuitem", { name: "Delete" }).click();

// Tooltip revealed on hover
await page.getByTestId("help-icon").hover();
const tooltip = page.getByRole("tooltip");
await expect(tooltip).toBeVisible();

// Modal revealed after form submit
await page.getByRole("button", { name: "Submit" }).click();
const modal = page.getByRole("dialog");
await modal.waitFor({ state: "visible" });
const confirmBtn = modal.getByRole("button", { name: "Confirm" });
```

---

## 4. Async / API-Loaded Content

Elements that appear after an API call completes (e.g. search results, data tables).

**Discovery:**

```bash
# Check network to understand the dependency
playwright-cli network

# Wait for networkidle then validate
playwright-cli run-code "async page => {
  await page.waitForLoadState('networkidle');
  const el = page.getByTestId('result-list');
  console.log('count:', await el.count());
  console.log('visible:', await el.isVisible());
}"

# Wait for a specific element to appear
playwright-cli run-code "async page => {
  await page.getByTestId('result-item').first().waitFor({ state: 'visible', timeout: 10000 });
  console.log('first item visible');
}"
```

**TypeScript:**

```typescript
// Wait for API-loaded list to appear
await page.waitForLoadState("networkidle");
const results = page.getByTestId("result-item");
await results.first().waitFor({ state: "visible" });
const count = await results.count();

// Wait for a specific text to appear in dynamic content
await page.getByText("3 results found").waitFor({ state: "visible" });

// Wait for URL change after async navigation
await page.getByRole("button", { name: "Go to Dashboard" }).click();
await page.waitForURL(/dashboard/);
const heading = page.getByRole("heading", { level: 1 });
await expect(heading).toBeVisible();

// Route mocking to control async content (for stable test data)
await page.route("**/api/search**", (route) =>
  route.fulfill({
    status: 200,
    body: JSON.stringify({ results: [{ id: 1, name: "Item A" }] }),
  }),
);
```

---

## 5. Web Components

Custom HTML elements (e.g. `<my-button>`, `<ui-input>`) with internal structure.

**Discovery:**

```bash
# Check if the component exposes standard roles/labels
playwright-cli run-code "async page => {
  const el = page.getByRole('button', { name: 'Submit' });
  console.log('count (role):', await el.count());
}"

# If not, inspect the component's internal element
playwright-cli eval "el => el.tagName + ' ' + el.shadowRoot?.querySelector('button')?.textContent" e5

# Try CSS with tag name
playwright-cli run-code "async page => {
  const el = page.locator('my-button[label=\"Submit\"]');
  console.log('count:', await el.count());
}"
```

**TypeScript:**

```typescript
// If component forwards ARIA roles (recommended)
page.getByRole("button", { name: "Submit" });

// If component has a custom attribute
page.locator('my-button[label="Submit"]');
page.locator('ui-input[name="email"]');

// If you need to interact with internal shadow DOM element
const component = page.locator("my-card");
const input = component.locator('input[type="text"]'); // pierces shadow root

// FRAGILE: shadow DOM internals — ask dev to expose testid or role
// page.locator('my-button').locator('button');
```

---

## 6. Multi-Tab Scenarios

When an action opens a new browser tab and you need to locate elements in it.

**Discovery:**

```bash
playwright-cli tab-list             # see all open tabs
playwright-cli tab-select 1         # switch to tab index 1
playwright-cli snapshot             # inspect elements in the new tab
```

**TypeScript:**

```typescript
// Wait for the new tab to open, then work with it
const [newPage] = await Promise.all([
  page.context().waitForEvent("page"),
  page.getByRole("link", { name: "Open in new tab" }).click(),
]);

await newPage.waitForLoadState("domcontentloaded");
const heading = newPage.getByRole("heading", { level: 1 });
await expect(heading).toBeVisible();
```

---

## 7. Overlays and z-index Stacking

When a transparent overlay, cookie banner, or modal covers the target element.

**Discovery:**

```bash
playwright-cli screenshot --filename=overlay.png   # see what is on screen
playwright-cli console error                        # check for blocked-click errors
playwright-cli run-code "async page => {
  // Check if an overlay is present
  const overlay = page.locator('[data-testid=\"cookie-banner\"]');
  console.log('overlay visible:', await overlay.isVisible());
}"
```

**TypeScript:**

```typescript
// Dismiss cookie banner before interacting with page
const cookieBanner = page.getByRole("dialog", { name: "Cookie consent" });
if (await cookieBanner.isVisible()) {
  await cookieBanner.getByRole("button", { name: "Accept" }).click();
  await cookieBanner.waitFor({ state: "hidden" });
}

// Wait for loading spinner to disappear
await page.getByTestId("loading-spinner").waitFor({ state: "hidden" });

// Dismiss toast notification
const toast = page.getByRole("alert");
if (await toast.isVisible()) {
  await toast.getByRole("button", { name: "Dismiss" }).click();
}
```

---

## 8. Dynamically Re-Rendered Elements (Detached)

Elements that are removed and re-added to the DOM after a state change (e.g. React re-render).

**Problem:** Playwright throws `Element is detached` after the re-render.

**TypeScript:**

```typescript
// ❌ Before — holds reference to detached element
const btn = page.getByRole("button", { name: "Save" });
await someActionThatCausesRerender();
await btn.click(); // throws: element detached

// ✅ After — re-resolve the locator after re-render
await someActionThatCausesRerender();
await page.getByRole("button", { name: "Save" }).click(); // fresh lookup

// ✅ Or wait for re-render to complete first
await page.getByTestId("form").waitFor({ state: "visible" });
await page.getByRole("button", { name: "Save" }).click();
```
