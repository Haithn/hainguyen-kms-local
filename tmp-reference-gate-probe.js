const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();

  await page.goto('https://evolvetest.elsevier.com/cs/', { waitUntil: 'domcontentloaded', timeout: 120000 });

  const maybe = async (loc) => { if (await loc.isVisible().catch(()=>false)) await loc.click({ force: true }).catch(()=>{}); };
  await maybe(page.getByRole('button', { name: /Accept all cookies/i }));

  await page.getByRole('button', { name: "I'm a Student" }).click();
  await page.waitForURL(/\/cs\/store\?role=student/, { timeout: 30000 });

  await page.locator('#code-entry').fill('189890_jfacultymanual_hsm0001');
  await page.locator('#btnRedeem').click({ force: true });

  let hasMessage = false;
  try {
    await page.getByText(/You must log in to view this content/i).waitFor({ timeout: 15000 });
    hasMessage = true;
  } catch {}

  const dump = await page.evaluate(() => {
    const msg = Array.from(document.querySelectorAll('*')).find((el) => /You must log in to view this content/i.test((el.textContent || '').trim()));
    const scope = msg ? (msg.closest('div,section,article,form,dialog') || msg.parentElement || document.body) : document.body;

    const clickable = Array.from(scope.querySelectorAll('button,a,input[type="button"],input[type="submit"],[role="button"], [ng-click]')).map((el) => ({
      tag: el.tagName,
      id: el.id || null,
      role: el.getAttribute('role'),
      type: el.getAttribute('type'),
      text: (el.textContent || el.getAttribute('value') || '').trim().replace(/\s+/g, ' '),
      ariaLabel: el.getAttribute('aria-label'),
      ngClick: el.getAttribute('ng-click'),
      className: el.className,
      visible: !!(el.offsetParent || el.getClientRects().length),
      outer: el.outerHTML.slice(0, 280),
    }));

    return {
      url: location.href,
      title: document.title,
      hasMessageText: !!msg,
      messageText: msg ? msg.textContent.trim().replace(/\s+/g, ' ') : null,
      scopeTag: scope.tagName,
      scopeClass: scope.className,
      clickableInScope: clickable,
      globalCandidates: Array.from(document.querySelectorAll('button,a,[role="button"]')).map((el) => ({
        tag: el.tagName,
        id: el.id || null,
        text: (el.textContent || '').trim().replace(/\s+/g, ' '),
        ariaLabel: el.getAttribute('aria-label'),
        ngClick: el.getAttribute('ng-click'),
        visible: !!(el.offsetParent || el.getClientRects().length),
      })).filter((x) => /login|sign in|password|one-time|passcode|continue|enter/i.test(`${x.text} ${x.id||''} ${x.ariaLabel||''} ${x.ngClick||''}`)),
      bodyHead: (document.body?.innerText || '').slice(0, 1800),
    };
  });

  console.log(JSON.stringify({ hasMessage, dump }, null, 2));
  await page.screenshot({ path: 'tmp-reference-gate-state.png', fullPage: true });
  await browser.close();
})();
