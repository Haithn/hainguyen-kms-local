# Eval Toolkit — Copy-Paste Snippets for Locator Inspection

All commands use `playwright-cli eval` (for a single element ref) or
`playwright-cli run-code` (for a full Playwright expression).

Replace `e5` with the actual element ref from `playwright-cli snapshot`.
Replace `'X'` placeholders with your actual selector values.

---

## Inspect: Basic Properties

```bash
# Full HTML of the element
playwright-cli eval "el => el.outerHTML" e5

# Tag name
playwright-cli eval "el => el.tagName" e5

# Visible text content
playwright-cli eval "el => el.textContent?.trim()" e5

# Inner text (excludes hidden elements)
playwright-cli eval "el => el.innerText?.trim()" e5
```

---

## Inspect: Locator Discovery Attributes

```bash
# data-testid
playwright-cli eval "el => el.dataset.testid" e5
playwright-cli eval "el => el.getAttribute('data-testid')" e5

# aria-label
playwright-cli eval "el => el.getAttribute('aria-label')" e5

# Associated <label> text (for form inputs)
playwright-cli eval "el => el.closest('label')?.textContent?.trim() ?? el.getAttribute('aria-label')" e5

# All data-* attributes at once
playwright-cli eval "el => Object.fromEntries([...el.attributes].map(a=>[a.name,a.value]).filter(([k])=>k.startsWith('data-')))" e5

# Role and accessible name together
playwright-cli eval "el => ({ tag: el.tagName, role: el.getAttribute('role'), label: el.getAttribute('aria-label'), testid: el.getAttribute('data-testid') })" e5

# Placeholder
playwright-cli eval "el => el.getAttribute('placeholder')" e5

# href (for links)
playwright-cli eval "el => el.getAttribute('href')" e5

# All attributes (full dump)
playwright-cli eval "el => Object.fromEntries([...el.attributes].map(a=>[a.name,a.value]))" e5
```

---

## Inspect: State

```bash
# Is it visible?
playwright-cli eval "el => el.getBoundingClientRect().width > 0 && window.getComputedStyle(el).display !== 'none'" e5

# Is it disabled?
playwright-cli eval "el => el.disabled" e5

# Is it checked (checkbox/radio)?
playwright-cli eval "el => el.checked" e5

# Current value (input/select)
playwright-cli eval "el => el.value" e5

# Is it covered by another element?
playwright-cli eval "el => { const r=el.getBoundingClientRect(); const t=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2); return t===el?'reachable':t?.tagName+'.'+t?.className+' is on top'; }" e5
```

---

## Validate: Locator Count (must === 1)

```bash
# getByTestId
playwright-cli run-code "async page => { console.log('count:', await page.getByTestId('X').count()) }"

# getByRole with name
playwright-cli run-code "async page => { console.log('count:', await page.getByRole('button', { name: 'X' }).count()) }"

# getByLabel
playwright-cli run-code "async page => { const el=page.getByLabel('X'); console.log('count:', await el.count(), '| tag:', await el.evaluate(e=>e.tagName)) }"

# getByPlaceholder
playwright-cli run-code "async page => { console.log('count:', await page.getByPlaceholder('X').count()) }"

# getByText (exact)
playwright-cli run-code "async page => { console.log('count:', await page.getByText('X', { exact: true }).count()) }"

# CSS locator
playwright-cli run-code "async page => { console.log('count:', await page.locator('.X').count()) }"

# Visibility check
playwright-cli run-code "async page => { const el=page.getByTestId('X'); console.log('count:', await el.count(), '| visible:', await el.isVisible()) }"
```

---

## Resolve: Ambiguous Locators (count > 1)

```bash
# Scope inside a parent by testid
playwright-cli run-code "async page => { const f=page.locator('[data-testid=\"FORM\"]'); console.log('count:', await f.getByRole('button',{name:'Submit'}).count()) }"

# Filter by text
playwright-cli run-code "async page => { console.log('count:', await page.getByRole('button').filter({hasText:'Submit'}).count()) }"

# Filter by child element
playwright-cli run-code "async page => { const row=page.locator('tr').filter({has:page.getByText('John Doe')}); console.log('count:', await row.count()) }"

# Scope inside dialog
playwright-cli run-code "async page => { const d=page.getByRole('dialog'); console.log('count:', await d.getByRole('button',{name:'Confirm'}).count()) }"

# and() — combine two conditions
playwright-cli run-code "async page => { const el=page.getByRole('button',{name:'X'}).and(page.locator(':visible')); console.log('count:', await el.count()) }"
```

---

## Special: iframe

```bash
# Find the iframe ref in snapshot, then inspect its attributes
playwright-cli eval "el => ({ src: el.src, title: el.title, id: el.id })" e2

# Validate a locator inside the frame
playwright-cli run-code "async page => { const f=page.frameLocator('iframe[title=\"X\"]'); console.log('count:', await f.getByLabel('Y').count()) }"

# iframe by src pattern
playwright-cli run-code "async page => { const f=page.frameLocator('iframe[src*=\"/payment\"]'); console.log('count:', await f.getByRole('textbox').count()) }"
```

---

## Special: Async / Loaded Content

```bash
# Wait for networkidle then validate
playwright-cli run-code "async page => { await page.waitForLoadState('networkidle'); const el=page.getByTestId('X'); console.log('count:', await el.count()) }"

# Wait for element to appear with timeout
playwright-cli run-code "async page => { await page.getByTestId('X').waitFor({state:'visible',timeout:5000}); console.log('appeared') }"

# Wait for URL change
playwright-cli run-code "async page => { await page.waitForURL(/X/); console.log('url:', page.url()) }"
```

---

## Special: Overlay / Blocking Element

```bash
# Check if a spinner or overlay is present
playwright-cli run-code "async page => { const s=page.getByTestId('spinner'); console.log('spinner visible:', await s.isVisible()) }"

# Wait for spinner to disappear
playwright-cli run-code "async page => { await page.getByTestId('spinner').waitFor({state:'hidden'}); console.log('spinner gone') }"

# Check what element is on top at a coordinate
playwright-cli run-code "async page => { const el=page.getByTestId('X'); const r=await el.boundingBox(); if(r){ const top=await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.getAttribute('data-testid'),{x:r.x+r.width/2,y:r.y+r.height/2}); console.log('top element testid:', top) } }"
```

---

## Workflow: Discover All Locators on a New Page

```bash
# 1. Open
playwright-cli open https://app.example.com/page

# 2. Snapshot — get full element map
playwright-cli snapshot

# 3. For each important element, run the full property check
playwright-cli eval "el => ({ tag: el.tagName, role: el.getAttribute('role'), label: el.getAttribute('aria-label'), testid: el.getAttribute('data-testid'), text: el.textContent?.trim().slice(0,50) })" e3
playwright-cli eval "el => ({ tag: el.tagName, role: el.getAttribute('role'), label: el.getAttribute('aria-label'), testid: el.getAttribute('data-testid'), text: el.textContent?.trim().slice(0,50) })" e5
playwright-cli eval "el => ({ tag: el.tagName, role: el.getAttribute('role'), label: el.getAttribute('aria-label'), testid: el.getAttribute('data-testid'), text: el.textContent?.trim().slice(0,50) })" e8

# 4. Validate top candidates
playwright-cli run-code "async page => { console.log('email count:', await page.getByLabel('Email address').count()) }"
playwright-cli run-code "async page => { console.log('submit count:', await page.getByRole('button',{name:'Sign In'}).count()) }"

# 5. Screenshot as evidence
playwright-cli screenshot --filename=page-discovered.png

# 6. Close
playwright-cli close
```
