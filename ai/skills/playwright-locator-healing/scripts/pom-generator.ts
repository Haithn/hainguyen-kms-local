#!/usr/bin/env ts-node
/**
 * POM Generator — Page Object Model Skeleton Generator
 *
 * Opens a real browser, navigates to a URL, inspects all interactive elements,
 * applies the locator strategy priority (testid → role → label → placeholder → text → css),
 * and writes a ready-to-refine TypeScript POM class file.
 *
 * Usage:
 *   npx ts-node ai/skills/playwright-locator-healing/scripts/pom-generator.ts \
 *     --url https://app.example.com/login \
 *     --name Login \
 *     --domain evolve
 *
 *   npx ts-node ai/skills/playwright-locator-healing/scripts/pom-generator.ts \
 *     --url https://app.example.com/dashboard \
 *     --name Dashboard \
 *     --domain evolve \
 *     --auth auth.json \
 *     --out page-objects/pages/evolve/dashboard.page.ts \
 *     --headed
 *
 * Options:
 *   --url <url>       Page URL to inspect (required)
 *   --name <Name>     PascalCase page name, e.g. Login, Checkout (required)
 *   --domain <name>   Domain folder: evolve | ps | admin | shared (required)
 *   --auth <path>     Auth state JSON from playwright-cli state-save (optional)
 *   --out <path>      Output file path (default: page-objects/pages/{domain}/{name}.page.ts)
 *   --headed          Run in headed mode (default: headless)
 */

import * as fs from "fs";
import * as path from "path";
import { chromium } from "@playwright/test";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface ElementInfo {
  tag: string;
  testid: string | null;
  role: string | null;
  ariaLabel: string | null;
  labelText: string | null;
  placeholder: string | null;
  text: string | null;
  id: string | null;
  type: string | null;
  name: string | null;
  className: string;
  isVisible: boolean;
  isInteractive: boolean;
}

type LocatorStrategy =
  | "testid"
  | "role"
  | "label"
  | "placeholder"
  | "text"
  | "css";

interface GeneratedLocator {
  propName: string;
  strategy: LocatorStrategy;
  stars: string;
  expression: string;
  fragile: boolean;
  comment: string;
}

// ─────────────────────────────────────────────
// Implicit ARIA roles by HTML tag
// ─────────────────────────────────────────────

const TAG_TO_ROLE: Record<string, string> = {
  button: "button",
  a: "link",
  input: "textbox", // refined below by type
  select: "combobox",
  textarea: "textbox",
  h1: "heading",
  h2: "heading",
  h3: "heading",
  h4: "heading",
  h5: "heading",
  h6: "heading",
  nav: "navigation",
  main: "main",
  footer: "contentinfo",
  header: "banner",
};

const INPUT_TYPE_TO_ROLE: Record<string, string> = {
  checkbox: "checkbox",
  radio: "radio",
  button: "button",
  submit: "button",
  reset: "button",
  search: "searchbox",
};

function getImplicitRole(el: ElementInfo): string | null {
  if (el.role) return el.role;
  if (el.tag === "input" && el.type) {
    return INPUT_TYPE_TO_ROLE[el.type] ?? "textbox";
  }
  return TAG_TO_ROLE[el.tag] ?? null;
}

// ─────────────────────────────────────────────
// Property name generator
// ─────────────────────────────────────────────

function toCamelCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+(.)/g, (_, ch) => ch.toUpperCase())
    .replace(/^[^a-z]/, "_");
}

function derivePropertyName(el: ElementInfo, role: string | null): string {
  const label =
    el.ariaLabel ?? el.labelText ?? el.placeholder ?? el.text ?? el.testid;
  if (!label) return toCamelCase(`${el.tag}-${el.type ?? "element"}`);

  const clean = label
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim()
    .slice(0, 30);
  const base = toCamelCase(clean);

  // Append role suffix to clarify element type
  const suffix =
    role === "button"
      ? "Button"
      : role === "link"
        ? "Link"
        : role === "textbox" || role === "searchbox"
          ? "Input"
          : role === "checkbox"
            ? "Checkbox"
            : role === "combobox"
              ? "Select"
              : role === "heading"
                ? "Heading"
                : "";

  return base + suffix;
}

// ─────────────────────────────────────────────
// Strategy selector — applies priority order
// ─────────────────────────────────────────────

function selectStrategy(el: ElementInfo): GeneratedLocator {
  const role = getImplicitRole(el);

  // 1. testid ⭐⭐⭐⭐⭐
  if (el.testid) {
    return {
      propName: derivePropertyName(el, role),
      strategy: "testid",
      stars: "⭐⭐⭐⭐⭐",
      expression: `page.getByTestId('${el.testid}')`,
      fragile: false,
      comment: `testid="${el.testid}"`,
    };
  }

  // 2. role with accessible name ⭐⭐⭐⭐
  const accessibleName = el.ariaLabel ?? el.labelText ?? el.text;
  const roleableRoles = [
    "button",
    "link",
    "checkbox",
    "radio",
    "combobox",
    "tab",
    "menuitem",
  ];

  if (role && accessibleName && roleableRoles.includes(role)) {
    const name = accessibleName.replace(/'/g, "\\'").slice(0, 60);
    return {
      propName: derivePropertyName(el, role),
      strategy: "role",
      stars: "⭐⭐⭐⭐",
      expression: `page.getByRole('${role}', { name: '${name}' })`,
      fragile: false,
      comment: `role=${role} name="${name}"`,
    };
  }

  // 3. label ⭐⭐⭐⭐
  const label = el.ariaLabel ?? el.labelText;
  if (label) {
    return {
      propName: derivePropertyName(el, role),
      strategy: "label",
      stars: "⭐⭐⭐⭐",
      expression: `page.getByLabel('${label.replace(/'/g, "\\'")}')`,
      fragile: false,
      comment: `label="${label}"`,
    };
  }

  // 4. placeholder ⭐⭐⭐
  if (el.placeholder) {
    return {
      propName: derivePropertyName(el, role),
      strategy: "placeholder",
      stars: "⭐⭐⭐",
      expression: `page.getByPlaceholder('${el.placeholder.replace(/'/g, "\\'")}')`,
      fragile: false,
      comment: `placeholder="${el.placeholder}"`,
    };
  }

  // 5. text ⭐⭐
  if (el.text && el.text.length > 0 && el.text.length <= 50) {
    const text = el.text.replace(/'/g, "\\'");
    return {
      propName: derivePropertyName(el, role),
      strategy: "text",
      stars: "⭐⭐",
      expression: `page.getByText('${text}', { exact: true })`,
      fragile: true,
      comment: `text="${el.text}" — ask dev to add data-testid`,
    };
  }

  // 6. CSS fallback ⭐⭐
  const selector = el.id
    ? `#${el.id}`
    : el.type
      ? `${el.tag}[type="${el.type}"]`
      : el.tag;

  return {
    propName: derivePropertyName(el, role),
    strategy: "css",
    stars: "⭐⭐",
    expression: `page.locator('${selector}')`,
    fragile: true,
    comment: `CSS fallback — ask dev to add data-testid`,
  };
}

// ─────────────────────────────────────────────
// De-duplicate property names
// ─────────────────────────────────────────────

function deduplicateNames(locators: GeneratedLocator[]): GeneratedLocator[] {
  const counts = new Map<string, number>();
  for (const l of locators) {
    counts.set(l.propName, (counts.get(l.propName) ?? 0) + 1);
  }

  const seen = new Map<string, number>();
  return locators.map((l) => {
    if ((counts.get(l.propName) ?? 0) <= 1) return l;
    const n = (seen.get(l.propName) ?? 0) + 1;
    seen.set(l.propName, n);
    return { ...l, propName: `${l.propName}${n}` };
  });
}

// ─────────────────────────────────────────────
// Code generator
// ─────────────────────────────────────────────

function generateClass(
  pageName: string,
  url: string,
  domain: string,
  locators: GeneratedLocator[],
): string {
  const className = `${pageName}Page`;
  const urlPath = new URL(url).pathname;

  const locatorLines = locators.map((l) => {
    const fragileComment = l.fragile ? `  // FRAGILE: ${l.comment}\n` : "";
    const strategyComment = `  // ${l.stars} ${l.strategy} — ${l.comment}`;

    return `${fragileComment}${strategyComment}\n  readonly ${l.propName}: Locator;\n`;
  });

  const constructorLines = locators.map((l) => {
    return `    this.${l.propName} = ${l.expression};`;
  });

  // Group actions by element type
  const actionMethods: string[] = [];

  for (const l of locators) {
    if (
      l.strategy === "testid" ||
      l.strategy === "role" ||
      l.strategy === "label" ||
      l.strategy === "placeholder"
    ) {
      if (
        l.expression.includes("getByRole('button'") ||
        (l.expression.includes("getByTestId") && l.propName.endsWith("Button"))
      ) {
        actionMethods.push(
          `  async click${capitalise(l.propName)}(): Promise<void> {\n` +
            `    await this.${l.propName}.click();\n` +
            `  }`,
        );
      } else if (
        l.expression.includes("getByLabel") ||
        l.expression.includes("getByPlaceholder") ||
        l.propName.endsWith("Input")
      ) {
        actionMethods.push(
          `  async fill${capitalise(l.propName)}(value: string): Promise<void> {\n` +
            `    await this.${l.propName}.fill(value);\n` +
            `  }`,
        );
      }
    }
  }

  return [
    `/**`,
    ` * ${className}`,
    ` *`,
    ` * Generated by pom-generator.ts from: ${url}`,
    ` * Domain : ${domain}`,
    ` * Review each locator — upgrade CSS/text locators to testid or role where possible.`,
    ` */`,
    ``,
    `import { type Page, type Locator } from '@playwright/test';`,
    ``,
    `export class ${className} {`,
    `  // ── Locators ────────────────────────────────────────────────────────`,
    ``,
    locatorLines.join("\n"),
    `  constructor(private readonly page: Page) {`,
    constructorLines.join("\n"),
    `  }`,
    ``,
    `  // ── Navigation ───────────────────────────────────────────────────────`,
    ``,
    `  async goto(baseURL: string): Promise<void> {`,
    `    await this.page.goto(\`\${baseURL}${urlPath}\`);`,
    `  }`,
    ``,
    ...(actionMethods.length > 0
      ? [
          `  // ── Actions (auto-generated — refine as needed) ─────────────────────`,
          ``,
          ...actionMethods.map((m) => m + "\n"),
        ]
      : []),
    `}`,
    ``,
  ].join("\n");
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };

  const url = get("--url");
  const name = get("--name");
  const domain = get("--domain");
  const auth = get("--auth");
  const outArg = get("--out");
  const headed = args.includes("--headed");

  if (!url || !name || !domain) {
    console.error(
      "Usage: pom-generator.ts --url <url> --name <PageName> --domain <domain> [--auth auth.json] [--out path] [--headed]",
    );
    process.exit(1);
  }

  const outPath = outArg
    ? path.resolve(process.cwd(), outArg)
    : path.resolve(
        process.cwd(),
        "page-objects",
        "pages",
        domain,
        `${name.toLowerCase()}.page.ts`,
      );

  console.log(`\n🔍 Opening browser → ${url}`);

  const browser = await chromium.launch({ headless: !headed });

  const contextOptions =
    auth && fs.existsSync(path.resolve(process.cwd(), auth))
      ? { storageState: path.resolve(process.cwd(), auth) }
      : {};

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
  console.log("📸 Page loaded — inspecting elements…");

  // Gather all interactive elements from the live DOM
  const elements: ElementInfo[] = await page.evaluate(() => {
    const INTERACTIVE = [
      "button",
      "a[href]",
      "input",
      "select",
      "textarea",
      '[role="button"]',
      '[role="link"]',
      '[role="checkbox"]',
      '[role="radio"]',
      '[role="combobox"]',
      '[role="tab"]',
      '[role="menuitem"]',
      '[role="textbox"]',
      "h1",
      "h2",
      "h3",
      '[role="alert"]',
      '[role="status"]',
    ].join(",");

    const seen = new Set<Element>();
    const results: ElementInfo[] = [];

    document.querySelectorAll<HTMLElement>(INTERACTIVE).forEach((el) => {
      if (seen.has(el)) return;
      seen.add(el);

      // Skip hidden elements
      const rect = el.getBoundingClientRect();
      const isVisible =
        rect.width > 0 &&
        rect.height > 0 &&
        window.getComputedStyle(el).display !== "none" &&
        window.getComputedStyle(el).visibility !== "hidden";

      // Find associated label text
      let labelText: string | null = null;
      const id = el.id;
      if (id) {
        const label = document.querySelector<HTMLElement>(`label[for="${id}"]`);
        labelText = label?.textContent?.trim() ?? null;
      }
      if (!labelText) {
        labelText = el.closest("label")?.textContent?.trim() ?? null;
      }
      // Remove the element's own text from the label text to avoid duplication
      if (labelText && el.textContent) {
        labelText =
          labelText.replace(el.textContent.trim(), "").trim() || labelText;
      }

      results.push({
        tag: el.tagName.toLowerCase(),
        testid: el.getAttribute("data-testid"),
        role: el.getAttribute("role"),
        ariaLabel: el.getAttribute("aria-label"),
        labelText: labelText || null,
        placeholder: el.getAttribute("placeholder"),
        text: el.textContent?.trim().slice(0, 60) || null,
        id: el.id || null,
        type: el.getAttribute("type"),
        name: el.getAttribute("name"),
        className: el.className,
        isVisible,
        isInteractive: ["button", "a", "input", "select", "textarea"].includes(
          el.tagName.toLowerCase(),
        ),
      });
    });

    return results;
  });

  await browser.close();

  // Filter: keep visible elements only, skip empty text-only divs
  const usable = elements.filter((el) => {
    if (!el.isVisible) return false;
    // Skip elements with no identifying info at all
    if (
      !el.testid &&
      !el.role &&
      !el.ariaLabel &&
      !el.labelText &&
      !el.placeholder &&
      !el.text &&
      !el.id
    )
      return false;
    return true;
  });

  console.log(`🔎 Found ${usable.length} visible interactive element(s)`);

  // Generate locators
  const rawLocators = usable.map(selectStrategy);
  const locators = deduplicateNames(rawLocators);

  // Stats
  const byStrategy = locators.reduce<Record<string, number>>((acc, l) => {
    acc[l.strategy] = (acc[l.strategy] ?? 0) + 1;
    return acc;
  }, {});

  console.log("\n📊 Locator strategy breakdown:");
  for (const [strategy, count] of Object.entries(byStrategy)) {
    console.log(`   ${strategy.padEnd(12)} ${count}`);
  }

  const fragileCount = locators.filter((l) => l.fragile).length;
  if (fragileCount > 0) {
    console.log(
      `\n⚠️  ${fragileCount} FRAGILE locator(s) generated — review and request data-testid from dev`,
    );
  }

  // Write the file
  const outDir = path.dirname(outPath);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const classContent = generateClass(name, url, domain, locators);
  fs.writeFileSync(outPath, classContent, "utf8");

  const relOut = path.relative(process.cwd(), outPath);
  console.log(`\n✅ POM class written to: ${relOut}`);
  console.log("\nNext steps:");
  console.log(
    "  1. Review each FRAGILE locator and request data-testid from the dev team",
  );
  console.log(
    "  2. Run locator-validator.ts to confirm all locators resolve to count: 1",
  );
  console.log(
    `     npx ts-node ai/skills/playwright-locator-healing/scripts/locator-validator.ts --url ${url} --pom ${relOut}`,
  );
  console.log(
    "  3. Add meaningful action methods (login, submit, etc.) to the class",
  );
  console.log();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
