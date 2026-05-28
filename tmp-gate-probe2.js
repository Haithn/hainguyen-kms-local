const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://evolvetest.elsevier.com/cs/store?role=student', { waitUntil: 'domcontentloaded', timeout: 120000 });

  const tryClick = async (loc) => {
    if (await loc.isVisible().catch(() => false)) {
      await loc.click({ force: true });
      return true;
    }
    return false;
  };

  await tryClick(page.getByRole('button', { name: /Accept all cookies/i }));
  await tryClick(page.locator('#onetrust-close-btn-container button, .onetrust-close-btn-handler').first());
  await tryClick(page.getByRole('button', { name: /Close/i }).first());

  await page.evaluate(() => {
    const sdk = document.querySelector('#onetrust-consent-sdk');
    if (sdk) sdk.remove();
    document.querySelectorAll('.onetrust-pc-dark-filter,.ot-sdk-row,.ot-fade-in').forEach((el) => el.remove());
  });

  await page.locator('#code-entry').fill('189890_jfacultymanual_hsm0001');
  await page.locator('#btnRedeem').click({ force: true });

  await page.waitForTimeout(7000);

  const gateDump = await page.evaluate(() => {
    const allButtons = Array.from(document.querySelectorAll('button,a[role="button"],a,input[type="button"],input[type="submit"]')).map((el) => ({
      tag: el.tagName,
      id: el.id || null,
      type: el.getAttribute('type'),
      text: (el.textContent || el.getAttribute('value') || '').trim().replace(/\s+/g, ' '),
      ariaLabel: el.getAttribute('aria-label'),
      href: el.getAttribute('href'),
      className: el.className,
      ngClick: el.getAttribute('ng-click'),
      visible: !!(el.offsetParent || el.getClientRects().length),
      outerHTML: el.outerHTML.slice(0, 300),
    }));

    return {
      url: location.href,
      hasLoginRequiredText: /You must log in to view this content/i.test(document.body?.innerText || ''),
      matchingButtons: allButtons.filter((b) => /login|sign in|password|one-time|passcode|enter password|continue/i.test((b.text || '') + ' ' + (b.id || '') + ' ' + (b.ariaLabel || '') + ' ' + (b.ngClick || ''))),
      visibleButtonsTop50: allButtons.filter((b) => b.visible).slice(0, 50),
      bodySnippet: (document.body?.innerText || '').slice(0, 2500),
    };
  });

  console.log(JSON.stringify(gateDump, null, 2));
  await page.screenshot({ path: 'tmp-self-enroll-gate.png', fullPage: true });
  await browser.close();
})();
