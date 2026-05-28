const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://evolvetest.elsevier.com/cs/store?role=student', { waitUntil: 'domcontentloaded', timeout: 120000 });

  const acceptBtn = page.getByRole('button', { name: /Accept all cookies/i });
  if (await acceptBtn.isVisible().catch(() => false)) {
    await acceptBtn.click();
  }

  await page.locator('#code-entry').fill('189890_jfacultymanual_hsm0001');
  await page.locator('#btnRedeem').click();

  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(5000);

  const gateDump = await page.evaluate(() => {
    const allButtons = Array.from(document.querySelectorAll('button,a[role="button"],a')).map((el) => ({
      tag: el.tagName,
      id: el.id || null,
      text: (el.textContent || '').trim().replace(/\s+/g, ' '),
      ariaLabel: el.getAttribute('aria-label'),
      href: el.getAttribute('href'),
      className: el.className,
      ngClick: el.getAttribute('ng-click'),
      visible: !!(el.offsetParent || el.getClientRects().length),
      outerHTML: el.outerHTML.slice(0, 300),
    }));

    const pageText = (document.body?.innerText || '').slice(0, 2000);

    return {
      url: location.href,
      hasLoginRequiredText: /You must log in to view this content/i.test(document.body?.innerText || ''),
      visibleButtons: allButtons.filter((b) => b.visible),
      matchingButtons: allButtons.filter((b) => /login|sign in|password|one-time|passcode|enter password/i.test((b.text || '') + ' ' + (b.id || '') + ' ' + (b.ariaLabel || '') + ' ' + (b.ngClick || ''))),
      pageText,
    };
  });

  console.log(JSON.stringify(gateDump, null, 2));
  await page.screenshot({ path: 'tmp-self-enroll-gate.png', fullPage: true });
  await browser.close();
})();
