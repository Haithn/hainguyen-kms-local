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

  // Give Angular time to render widgets.
  await page.waitForTimeout(5000);

  const candidates = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input,textarea')).map((el) => ({
      tag: el.tagName,
      id: el.id || null,
      name: el.getAttribute('name'),
      type: el.getAttribute('type'),
      placeholder: el.getAttribute('placeholder'),
      className: el.className,
      ariaLabel: el.getAttribute('aria-label'),
      visible: !!(el.offsetParent || el.getClientRects().length),
      outerHTML: el.outerHTML.slice(0, 400)
    }));

    const buttons = Array.from(document.querySelectorAll('button,a[role="button"],a')).map((el) => ({
      tag: el.tagName,
      id: el.id || null,
      role: el.getAttribute('role'),
      text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120),
      className: el.className,
      ariaLabel: el.getAttribute('aria-label'),
      href: el.getAttribute('href'),
      ngClick: el.getAttribute('ng-click'),
      visible: !!(el.offsetParent || el.getClientRects().length),
      outerHTML: el.outerHTML.slice(0, 400)
    }));

    const interestingInputs = inputs.filter(i =>
      /redeem|course|access|code/i.test((i.id||'') + ' ' + (i.name||'') + ' ' + (i.placeholder||'') + ' ' + (i.className||'') + ' ' + (i.ariaLabel||''))
    );

    const interestingButtons = buttons.filter(b =>
      /redeem|access code|course id|submit/i.test((b.text||'') + ' ' + (b.id||'') + ' ' + (b.className||'') + ' ' + (b.ariaLabel||'') + ' ' + (b.ngClick||''))
    );

    return { interestingInputs, interestingButtons, allInputCount: inputs.length, allButtonCount: buttons.length };
  });

  console.log('=== RENDER SUMMARY ===');
  console.log(JSON.stringify(candidates, null, 2));

  await page.screenshot({ path: 'tmp-store-student.png', fullPage: true });
  console.log('Saved screenshot: tmp-store-student.png');

  await browser.close();
})();
