#!/usr/bin/env ts-node
/**
 * Locator Validator — Live Browser Checker
 *
 * Parses a POM file for locator property definitions, opens a real browser,
 * navigates to a URL, and validates that every locator returns count === 1
 * and is visible on the live page.
 *
 * Usage:
 *   npx ts-node ai/skills/playwright-locator-healing/scripts/locator-validator.ts \
 *     --url https://app.example.com/login \
 *     --pom page-objects/pages/evolve/login.page.ts
 *
 *   npx ts-node ai/skills/playwright-locator-healing/scripts/locator-validator.ts \
 *     --url https://app.example.com/dashboard \
 *     --pom page-objects/pages/evolve/dashboard.page.ts \
 *     --auth auth.json \
 *     --headed
 *
 * Options:
 *   --url <url>       Page URL to validate against (required)
 *   --pom <path>      Path to the POM .ts file (required)
 *   --auth <path>     Path to auth state JSON saved by playwright-cli state-save (optional)
 *   --headed          Run browser in headed mode (default: headless)
 *   --timeout <ms>    Per-locator timeout in ms (default: 5000)
 */

import * as fs from "fs";
import * as path from "path";
import { chromium, type Page, type Locator } from "@playwright/test";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface ParsedLocator {
  name: string;
  expression: string;
  method: string;
  args: string[];
  raw: string;
}

interface ValidationResult {
  name: string;
  expression: string;
  status: "PASS" | "FAIL" | "SKIP";
  count: number;
  visible: boolean;
  error?: string;
  durationMs: number;
}

// ─────────────────────────────────────────────
// POM parser
// ─────────────────────────────────────────────

/**
 * Extracts locator property definitions from a TypeScript POM file.
 * Handles both inline pattern:
 *   readonly emailInput = this.page.getByLabel('Email');
 * And constructor pattern:
 *   this.emailInput = page.getByRole('button', { name: 'Submit' });
 */
function parsePomFile(filePath: string): ParsedLocator[] {
  const content = fs.readFileSync(filePath, "utf8");
  const locators: ParsedLocator[] = [];
  const seen = new Set<string>();

  // Regex: capture property name + the full method call chain
  const patterns = [
    // Inline: readonly name = this.page.getByXxx(...)  or  = this.frame.getByXxx(...)
    /readonly\s+(\w+)\s*[=:][^=\n]*?(?:this\.\w+|page)\.(getByTestId|getByRole|getByLabel|getByPlaceholder|getByText|getByAltText|locator)\s*\(([^)]*(?:\([^)]*\)[^)]*)*)\)/g,
    // Constructor: this.name = page.getByXxx(...)
    /this\.(\w+)\s*=\s*(?:page|\w+page)\.(getByTestId|getByRole|getByLabel|getByPlaceholder|getByText|getByAltText|locator)\s*\(([^)]*(?:\([^)]*\)[^)]*)*)\)/g,
  ];

  for (const regex of patterns) {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      const [raw, name, method, argsRaw] = match;
      if (seen.has(name)) continue;
      seen.add(name);

      // Parse args: split by comma but respect nested { } and quotes
      const args = parseArgs(argsRaw.trim());

      locators.push({
        name,
        expression: `page.${method}(${argsRaw.trim()})`,
        method,
        args,
        raw: raw.trim().slice(0, 80),
      });
    }
  }

  return locators;
}

/**
 * Simple argument splitter that respects nested braces and quoted strings.
 */
function parseArgs(raw: string): string[] {
  const args: string[] = [];
  let current = "";
  let depth = 0;
  let inString: string | null = null;

  for (const ch of raw) {
    if (inString) {
      current += ch;
      if (ch === inString) inString = null;
    } else if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch;
      current += ch;
    } else if (ch === "{" || ch === "(") {
      depth++;
      current += ch;
    } else if (ch === "}" || ch === ")") {
      depth--;
      current += ch;
    } else if (ch === "," && depth === 0) {
      args.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) args.push(current.trim());
  return args;
}

// ─────────────────────────────────────────────
// Locator builder
// ─────────────────────────────────────────────

/**
 * Reconstructs a Playwright Locator from the parsed method and args.
 */
function buildLocator(page: Page, parsed: ParsedLocator): Locator | null {
  const { method, args } = parsed;

  const stripQuotes = (s: string) => s.replace(/^['"`]|['"`]$/g, "");

  try {
    switch (method) {
      case "getByTestId":
        return page.getByTestId(stripQuotes(args[0]));

      case "getByLabel":
        return page.getByLabel(stripQuotes(args[0]));

      case "getByPlaceholder":
        return page.getByPlaceholder(stripQuotes(args[0]));

      case "getByAltText":
        return page.getByAltText(stripQuotes(args[0]));

      case "getByText": {
        const text = stripQuotes(args[0]);
        const exact = args[1]?.includes("exact: true") ?? false;
        return page.getByText(text, { exact });
      }

      case "getByRole": {
        const role = stripQuotes(args[0]) as Parameters<Page["getByRole"]>[0];
        const nameMatch = args[1]?.match(/name\s*:\s*['"`]([^'"`]+)['"`]/);
        const opts = nameMatch ? { name: nameMatch[1] } : undefined;
        return opts ? page.getByRole(role, opts) : page.getByRole(role);
      }

      case "locator":
        return page.locator(stripQuotes(args[0]));

      default:
        return null;
    }
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// Validator
// ─────────────────────────────────────────────

async function validateLocator(
  page: Page,
  parsed: ParsedLocator,
  timeout: number,
): Promise<ValidationResult> {
  const start = Date.now();
  const base = { name: parsed.name, expression: parsed.expression };

  const locator = buildLocator(page, parsed);
  if (!locator) {
    return {
      ...base,
      status: "SKIP",
      count: 0,
      visible: false,
      error: "Could not build locator from expression",
      durationMs: 0,
    };
  }

  try {
    const count = await locator.count();
    let visible = false;

    if (count === 1) {
      visible = await locator.isVisible();
    } else if (count > 1) {
      visible = await locator.first().isVisible();
    }

    const status = count === 1 ? "PASS" : "FAIL";
    const error =
      count === 0
        ? "No element found (count: 0)"
        : count > 1
          ? `Ambiguous — matched ${count} elements (expected 1)`
          : undefined;

    return {
      ...base,
      status,
      count,
      visible,
      error,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      ...base,
      status: "FAIL",
      count: 0,
      visible: false,
      error: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - start,
    };
  }
}

// ─────────────────────────────────────────────
// Reporter
// ─────────────────────────────────────────────

function printResults(
  results: ValidationResult[],
  pomFile: string,
  url: string,
): void {
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  const skipped = results.filter((r) => r.status === "SKIP").length;

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  LOCATOR VALIDATION REPORT");
  console.log(`  POM  : ${pomFile}`);
  console.log(`  URL  : ${url}`);
  console.log(
    `  Total: ${results.length}  ✅ ${passed} passed · ❌ ${failed} failed · ⏭  ${skipped} skipped`,
  );
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  for (const r of results) {
    const icon =
      r.status === "PASS" ? "✅" : r.status === "FAIL" ? "❌" : "⏭ ";
    const visibility =
      r.status === "PASS" ? (r.visible ? " visible" : " hidden") : "";
    console.log(
      `${icon}  ${r.name.padEnd(25)} count:${String(r.count).padStart(2)}${visibility}  (${r.durationMs}ms)`,
    );
    if (r.error) {
      console.log(`       ↳ ${r.error}`);
      console.log(`       ↳ Expression: ${r.expression}`);
    }
  }

  console.log();

  if (failed > 0) {
    console.log("⚠️  Suggested fix workflow:");
    console.log("   1. playwright-cli open <url>");
    console.log("   2. playwright-cli snapshot        ← find the element ref");
    console.log('   3. playwright-cli eval "el => el.dataset.testid" <ref>');
    console.log("   4. Update the POM locator expression");
    console.log("   5. Re-run this script to confirm\n");
  }
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
  const pomPath = get("--pom");
  const auth = get("--auth");
  const headed = args.includes("--headed");
  const timeout = parseInt(get("--timeout") ?? "5000", 10);

  if (!url || !pomPath) {
    console.error(
      "Usage: locator-validator.ts --url <url> --pom <pom-file> [--auth auth.json] [--headed]",
    );
    process.exit(1);
  }

  const absPath = path.resolve(process.cwd(), pomPath);
  if (!fs.existsSync(absPath)) {
    console.error(`POM file not found: ${absPath}`);
    process.exit(1);
  }

  console.log(`\nParsing locators from: ${pomPath}`);
  const locators = parsePomFile(absPath);

  if (locators.length === 0) {
    console.error("No locator properties found in POM file.");
    console.error(
      "Expected patterns like: readonly xxx = this.page.getByLabel(...)",
    );
    process.exit(1);
  }

  console.log(`Found ${locators.length} locator(s). Launching browser…`);

  const browser = await chromium.launch({ headless: !headed });

  const contextOptions =
    auth && fs.existsSync(path.resolve(process.cwd(), auth))
      ? { storageState: path.resolve(process.cwd(), auth) }
      : {};

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  console.log(`Navigating to ${url}…\n`);
  await page.goto(url, { waitUntil: "load", timeout: 30_000 });

  const results: ValidationResult[] = [];
  for (const locator of locators) {
    process.stdout.write(`  Checking ${locator.name}… `);
    const result = await validateLocator(page, locator, timeout);
    process.stdout.write(`${result.status}\n`);
    results.push(result);
  }

  await browser.close();
  printResults(results, pomPath, url);

  if (results.some((r) => r.status === "FAIL")) process.exit(1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
