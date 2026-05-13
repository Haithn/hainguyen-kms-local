# Debugging — Finding and Diagnosing Broken Locators

Two toolsets: **playwright-cli** (live browser inspection) and **TypeScript** (in-test debugging).

---

## playwright-cli Debugging

### Console errors — is the page throwing JS exceptions?

```bash
playwright-cli open https://app.example.com/login
playwright-cli console           # all messages (log, warn, error)
playwright-cli console error     # errors only
playwright-cli console warning   # warnings only
```

Use when: elements fail to render because a JS error prevents the component from mounting.

---

### Network — is the element waiting for an API call?

```bash
playwright-cli network           # recent HTTP requests and responses
```

Use when: a table, list, or dynamic element is empty — check if the API call failed or is slow.

---

### Tracing — frame-by-frame replay

```bash
playwright-cli tracing-start
playwright-cli goto https://app.example.com/login
playwright-cli fill e3 "user@example.com"
playwright-cli click e4
playwright-cli tracing-stop       # saves trace.zip

# Replay the trace:
npx playwright show-trace trace.zip
```

Trace captures: every action, DOM snapshots, screenshots, network requests, console logs, timing.
Use when: a test fails intermittently and you need to see exactly what the page looked like.

---

### Screenshot — capture state at point of failure

```bash
playwright-cli screenshot --filename=failure-state.png
playwright-cli screenshot e5 --filename=element.png    # screenshot a specific element ref
```

Use when: you need a visual of what is rendered before/after an interaction.

---

### Video — record full session

```bash
playwright-cli video-start
playwright-cli goto https://app.example.com
playwright-cli click e3
playwright-cli video-stop session.webm
```

Use when: you need a shareable recording to reproduce a flaky failure.

---

### Eval — inspect an element's properties live

```bash
# Is the element visible in the DOM?
playwright-cli eval "el => el.getBoundingClientRect()" e5

# Is it disabled?
playwright-cli eval "el => el.disabled" e5

# What are its computed styles?
playwright-cli eval "el => window.getComputedStyle(el).display" e5

# Is it covered by another element?
playwright-cli eval "el => {
  const rect = el.getBoundingClientRect();
  const top = document.elementFromPoint(rect.left + rect.width/2, rect.top + rect.height/2);
  return top === el ? 'reachable' : top?.tagName + ' is on top';
}" e5
```

---

## TypeScript In-Test Debugging

### Log element state at runtime

```typescript
const el = page.getByTestId("submit-btn");
console.log("visible:", await el.isVisible());
console.log("enabled:", await el.isEnabled());
console.log("text:", await el.textContent());
console.log("class:", await el.getAttribute("class"));
console.log("testid:", await el.getAttribute("data-testid"));
console.log("bounding:", await el.boundingBox());
```

### Pause the browser and inspect manually

```typescript
test("debug login", async ({ page }) => {
  await page.goto("https://app.example.com/login");
  await page.pause(); // browser pauses here — use DevTools to inspect
  // continue manually or resume in the Playwright inspector UI
});
```

### Run a single test in debug mode (Playwright Inspector)

```bash
npx playwright test login --debug
# Opens Playwright Inspector — step through actions, test locators interactively
```

### Headed mode — watch the browser as the test runs

```bash
npx playwright test login --headed
```

### Slow motion — see what is happening step by step

```typescript
// playwright.config.ts
use: {
  launchOptions: { slowMo: 500 },  // 500ms between actions
}
```

---

## Failure Symptom → Cause → Fix

| Symptom                  | Likely cause              | Discovery                                                                 | Fix                                        |
| ------------------------ | ------------------------- | ------------------------------------------------------------------------- | ------------------------------------------ |
| `count: 0`               | Element not in DOM yet    | `playwright-cli network`                                                  | Add `.waitFor({ state: 'visible' })`       |
| `count: 0`               | Inside an iframe          | `playwright-cli eval "el => el.tagName" e2` on parent                     | Wrap with `frameLocator()`                 |
| `count: 0`               | Label text changed        | `playwright-cli eval "el => el.closest('label')?.textContent?.trim()" e4` | Update `getByLabel(...)`                   |
| `count: 0`               | Locator is wrong strategy | `playwright-cli eval "el => el.outerHTML" e5`                             | Pick correct strategy                      |
| `count > 1`              | Locator too broad         | `playwright-cli run-code` with candidate                                  | Scope inside parent container              |
| `count > 1`              | Duplicate element in DOM  | `playwright-cli snapshot`                                                 | Add `.filter({ hasText: ... })`            |
| Element detached         | Re-render between steps   | `playwright-cli console error`                                            | Re-resolve locator after re-render         |
| Element not clickable    | Covered by overlay        | `playwright-cli screenshot`                                               | Wait for overlay to hide first             |
| Passes locally, fails CI | Race condition            | `playwright-cli tracing-start`                                            | Replace `waitForTimeout` with element wait |
| Passes locally, fails CI | Different viewport        | Check CI browser config                                                   | Set explicit viewport in config            |
| Flaky on retry           | Generated class name      | `playwright-cli eval "el => el.className" e5`                             | Find testid or role, stop using CSS class  |
| `strict mode violation`  | Multiple elements match   | `playwright-cli run-code` count check                                     | Scope more specifically                    |

---

## How to Read a Playwright Trace

After `playwright-cli tracing-stop` or a failed CI run, open the trace:

```bash
npx playwright show-trace trace.zip
```

**What to look for:**

- **Actions panel** (left) — each action with pass/fail status and duration
- **DOM snapshot** (right top) — DOM at that moment; use the locator picker to test locators
- **Network tab** (right bottom) — HTTP requests; check for failed API calls that caused empty content
- **Console tab** — JS errors that may have prevented rendering
- **Timeline** — find slow actions that may indicate race conditions

**Key trace use-cases:**

- Click shows `element not visible` → check DOM snapshot, find overlay covering target
- Fill shows `count: 0` → check network tab for failed data load
- Test fails on retry only → check timeline for timing differences
