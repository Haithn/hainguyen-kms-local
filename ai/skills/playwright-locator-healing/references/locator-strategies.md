# Locator Strategies — Deep Dive

Full reference for all 7 locator strategies in order of priority.
For the quick lookup table, see [../SKILL.md](../SKILL.md).

---

## ⭐⭐⭐⭐⭐ 1. Test IDs — Most Reliable

```typescript
// HTML
<button data-testid="submit-button">Sign In</button>

// Playwright
page.getByTestId('submit-button')
page.locator('[data-testid="submit-button"]')  // equivalent
```

**Advantages**

- Stable across UI changes — unaffected by styling, layout, copy, or refactors
- Explicit QA/dev contract — purpose-built for testing
- Fastest to locate — direct attribute match
- Works across any framework (React, Vue, Angular, plain HTML)

**Disadvantages**

- Requires dev coordination — not always present in legacy apps
- Can be forgotten during feature work

**When to use:** Always, when available. If missing, request the dev team add `data-testid`.

**Discovery command:**

```bash
playwright-cli eval "el => el.dataset.testid" e5
playwright-cli eval "el => el.getAttribute('data-testid')" e5
```

---

## ⭐⭐⭐⭐ 2. ARIA Role — Recommended Fallback

```typescript
page.getByRole("button", { name: "Sign In" });
page.getByRole("link", { name: "Home" });
page.getByRole("textbox", { name: "Email" });
page.getByRole("checkbox", { name: "Remember me" });
page.getByRole("combobox"); // dropdowns
page.getByRole("tab", { name: "Settings" });
page.getByRole("dialog"); // modals
page.getByRole("heading", { level: 1, name: "Dashboard" });
page.getByRole("menuitem", { name: "Log out" });
page.getByRole("status"); // status regions
```

**Common role reference:**

| Element                              | Role         |
| ------------------------------------ | ------------ |
| `<button>`                           | `button`     |
| `<a href>`                           | `link`       |
| `<input type="text/email/password">` | `textbox`    |
| `<input type="checkbox">`            | `checkbox`   |
| `<input type="radio">`               | `radio`      |
| `<select>`                           | `combobox`   |
| `<h1>`–`<h6>`                        | `heading`    |
| `<nav>`                              | `navigation` |
| `[role="dialog"]`                    | `dialog`     |
| `[role="tab"]`                       | `tab`        |
| `[role="menuitem"]`                  | `menuitem`   |
| `[role="alert"]`                     | `alert`      |

**Advantages**

- Semantic — survives CSS and layout changes
- Encourages accessible HTML
- Works across all frameworks
- `name` parameter narrows down to exact element

**Disadvantages**

- Requires elements to have correct ARIA roles (standard HTML elements have implicit roles)
- Custom components may have missing or incorrect roles

**Discovery command:**

```bash
playwright-cli eval "el => ({ role: el.getAttribute('role') ?? el.tagName.toLowerCase(), name: el.getAttribute('aria-label') ?? el.textContent?.trim() })" e5
```

---

## ⭐⭐⭐⭐ 3. Label — Great for Form Inputs

```typescript
// Explicit <label> element
// HTML: <label for="email">Email address</label><input id="email" />
page.getByLabel("Email address");

// Implicit label wrapping
// HTML: <label>Password <input type="password" /></label>
page.getByLabel("Password");

// aria-label attribute
// HTML: <div aria-label="Close modal">×</div>
page.getByLabel("Close modal");

// aria-labelledby
// HTML: <span id="lbl">Search</span><input aria-labelledby="lbl" />
page.getByLabel("Search");
```

**Advantages**

- Directly reflects what the user sees
- Survives input type changes
- Works for any labelled element, not just inputs

**Disadvantages**

- Breaks if label text changes (copy updates)
- Requires a `<label>` or `aria-label`/`aria-labelledby` attribute

**Discovery command:**

```bash
playwright-cli eval "el => el.closest('label')?.textContent?.trim() ?? el.getAttribute('aria-label')" e5
```

---

## ⭐⭐⭐ 4. Placeholder

```typescript
// HTML: <input placeholder="Enter your email" />
page.getByPlaceholder("Enter your email");

// Partial match
page.getByPlaceholder("email", { exact: false });
```

**Advantages**

- Simple fallback for inputs without a visible label
- Intuitive — matches what users see in the empty field

**Disadvantages**

- Breaks if placeholder copy changes
- Placeholders are not a substitute for labels (accessibility concern)

**Discovery command:**

```bash
playwright-cli eval "el => el.getAttribute('placeholder')" e5
```

---

## ⭐⭐ 5. Text Content — Stable Text Only

```typescript
page.getByText("Forgot your password?", { exact: true });
page.getByText("Welcome back"); // partial match
// Prefer role when the element has one:
page.getByRole("link", { name: "Forgot your password?" });
```

**Advantages**

- Quick to write for one-off scripts

**Disadvantages**

- Breaks on text changes (translations, copy updates, A/B tests)
- May match multiple elements across the page
- Not specific about element type

**Always add:**

```typescript
// FRAGILE: text may change — prefer getByRole or getByTestId
readonly forgotLink = this.page.getByText('Forgot your password?', { exact: true });
```

**Discovery command:**

```bash
playwright-cli eval "el => el.textContent?.trim()" e5
```

---

## ⭐⭐ 6. CSS Selector — Structural Cases

```typescript
page.locator("#stable-id"); // ID — good if truly stable
page.locator('input[type="email"]'); // attribute match
page.locator("form > button.primary"); // structural relationship
page.locator('[class*="alert"]'); // partial class match
page.locator('[data-cy="submit"]'); // custom data attribute (non-testid)
page.locator('button:has-text("Login")'); // CSS + text filter
page.locator("tr").filter({ hasText: "John" }); // filter on text within element
```

**CSS reference:**

```
.classname         single class
.class1.class2     multiple classes (AND)
[attr="value"]     exact attribute match
[attr*="value"]    attribute contains
[attr^="value"]    attribute starts with
[attr$="value"]    attribute ends with
:first-child       first sibling
:last-child        last sibling
:nth-child(n)      nth sibling
:disabled          disabled state
:visible           visible elements
```

**Advantages**

- Flexible — covers structural and attribute patterns
- Works for custom `data-*` attributes that aren't `data-testid`

**Disadvantages**

- Breaks when CSS-in-JS class names regenerate (`.css-1a2b3c`)
- Complex chains are brittle
- Hard to read and maintain at depth

**Always add when using CSS:**

```typescript
// FRAGILE: CSS fallback — request data-testid="error-banner" from dev
readonly errorBanner = this.page.locator('.alert-danger');
```

---

## ⭐ 7. XPath — Last Resort

```typescript
page.locator('xpath=//button[contains(text(), "Submit")]');
page.locator('xpath=//label[text()="Email"]/following-sibling::input[1]');
page.locator('xpath=//div[@class="container"]//button');
```

**Advantages**

- Can express relationships that CSS cannot (parent, preceding-sibling)
- Only option for some legacy/inaccessible third-party widgets

**Disadvantages**

- Slowest — full DOM parse on every evaluation
- Breaks on any structural DOM change
- Hard to read, review, and maintain
- Not recommended by the Playwright team

**Always add:**

```typescript
// XPath: last resort — no testid, role, or label available on this third-party widget
readonly closeWidget = this.page.locator('xpath=//div[@aria-label="widget"]/button[1]');
```

---

## Migration Guide: Fragile → Modern

```typescript
// ❌ XPath positional
page.locator("xpath=//form/div[2]/button[1]");
// ✅ Role
page.getByRole("button", { name: "Sign In" });

// ❌ XPath text
page.locator('xpath=//button[contains(text(),"Submit")]');
// ✅ Role with name
page.getByRole("button", { name: "Submit" });

// ❌ XPath sibling
page.locator('xpath=//label[text()="Email"]/following-sibling::input[1]');
// ✅ Label
page.getByLabel("Email");

// ❌ Generated CSS class
page.locator(".css-1a2b3c4d");
// ✅ testid (after dev adds it) or label
page.getByTestId("email-input");

// ❌ nth-child positional
page.locator("table tr:nth-child(3) button");
// ✅ Scoped filter
page
  .locator("tr")
  .filter({ hasText: "John Doe" })
  .getByRole("button", { name: "Edit" });

// ❌ Global text selector
page.locator("text=Submit");
// ✅ Role
page.getByRole("button", { name: "Submit" });
```

---

## Performance: Locator Speed (Fastest → Slowest)

1. `getByTestId` — direct attribute match
2. `getByRole` with exact name — accessibility tree lookup
3. `getByLabel` — paired element search
4. CSS selector (simple) — direct DOM query
5. `getByText` — text content scan
6. CSS selector (complex chain) — DOM traversal
7. XPath — full DOM parse (slowest)

**Optimisation tips:**

```typescript
// ✅ Narrow scope — faster and unambiguous
const modal = page.getByRole("dialog");
const submit = modal.getByRole("button", { name: "Submit" });

// ❌ Global search — slower, risks collision
const submit = page.getByRole("button", { name: "Submit" });

// ✅ One compound wait
await page.getByTestId("table").waitFor({ state: "visible" });

// ❌ Two sequential waits
await page.getByTestId("spinner").waitFor({ state: "hidden" });
await page.getByTestId("table").waitFor({ state: "visible" });
```

---

## Resources

- [Playwright Locators Documentation](https://playwright.dev/docs/locators)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [ARIA Roles Reference — MDN](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles)
- [CSS Selector Reference — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors)
- [Playwright Accessibility Testing](https://playwright.dev/docs/accessibility-testing)
