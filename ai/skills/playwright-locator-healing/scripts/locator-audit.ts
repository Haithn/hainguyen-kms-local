#!/usr/bin/env ts-node
/**
 * Locator Audit — Static Analyser
 *
 * Scans POM and spec files for fragile locator patterns without opening a browser.
 * Reads page-objects/ and tests/ directories by default.
 *
 * Usage:
 *   npx ts-node ai/skills/playwright-locator-healing/scripts/locator-audit.ts
 *   npx ts-node ai/skills/playwright-locator-healing/scripts/locator-audit.ts --dir page-objects/pages/evolve
 *   npx ts-node ai/skills/playwright-locator-healing/scripts/locator-audit.ts --fail-on-high
 *
 * Options:
 *   --dir <path>      Directory or file to scan (default: page-objects and tests)
 *   --fail-on-high    Exit with code 1 if any HIGH issues are found (useful in CI)
 */

import * as fs from "fs";
import * as path from "path";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type Severity = "HIGH" | "MEDIUM" | "LOW";

interface Issue {
  file: string;
  line: number;
  code: string;
  type: string;
  severity: Severity;
  message: string;
  suggestion: string;
}

interface LinePattern {
  type: string;
  severity: Severity;
  regex: RegExp;
  message: string;
  suggestion: string;
  /** Only apply to files matching this pattern */
  fileOnly?: RegExp;
  /** Skip files matching this pattern */
  skipFile?: RegExp;
}

// ─────────────────────────────────────────────
// Patterns
// ─────────────────────────────────────────────

const LINE_PATTERNS: LinePattern[] = [
  {
    type: "XPATH",
    severity: "HIGH",
    regex: /[`'"]\s*xpath=|\.locator\(['"`]\/\//,
    message: "XPath detected — brittle and slow, breaks on DOM restructuring",
    suggestion: "Replace with getByRole, getByLabel, or getByTestId",
  },
  {
    type: "GENERATED_CLASS",
    severity: "HIGH",
    regex: /locator\(['"`][^'"` ]*\.css-[a-zA-Z0-9_-]{4,}/,
    message: "Generated CSS-in-JS class detected — breaks on every rebuild",
    suggestion:
      "Inspect with playwright-cli eval to find data-testid, role, or label",
  },
  {
    type: "WAIT_FOR_TIMEOUT",
    severity: "HIGH",
    regex: /waitForTimeout\(\s*\d/,
    message: "waitForTimeout detected — timing-dependent, causes flaky tests",
    suggestion:
      "Replace with .waitFor({ state: 'visible' }) or page.waitForURL()",
  },
  {
    type: "SPEC_INLINE_LOCATOR",
    severity: "HIGH",
    regex:
      /\bpage\.(locator|getByTestId|getByRole|getByLabel|getByText|getByPlaceholder|getByAltText)\s*\(/,
    message: "Locator defined inline in spec file — belongs in a POM class",
    suggestion: "Move to the page object in page-objects/pages/{domain}/",
    fileOnly: /\.spec\.ts$/,
  },
  {
    type: "POSITIONAL_SELECTOR",
    severity: "MEDIUM",
    regex: /:nth-child\(|:nth-of-type\(|\.nth\(\s*\d/,
    message: "Positional selector detected — breaks when element order changes",
    suggestion:
      "Use .filter({ hasText: '...' }) or scope to a specific parent instead",
    skipFile: /\.spec\.ts$/,
  },
  {
    type: "MISSING_FRAGILE_COMMENT",
    severity: "MEDIUM",
    // CSS class, ID selector, or getByText without FRAGILE comment
    regex: /\.locator\(['"`][.#]|getByText\s*\(/,
    message: "CSS / text locator without a // FRAGILE: comment",
    suggestion:
      "Add // FRAGILE: <reason> — ask dev to add data-testid to this element",
    skipFile: /\.spec\.ts$/,
  },
  {
    type: "LONG_CSS_CHAIN",
    severity: "LOW",
    regex: /locator\(['"`][^'"` ]*\s+[^'"` ]*\s+[^'"` ]*\s+[^'"` ]*/,
    message: "Long CSS selector chain detected — fragile and hard to maintain",
    suggestion:
      "Scope to a parent container and use a shorter, semantic selector",
  },
];

// ─────────────────────────────────────────────
// File walker
// ─────────────────────────────────────────────

function walkDir(dir: string, collected: string[] = []): string[] {
  if (!fs.existsSync(dir)) return collected;

  const stat = fs.statSync(dir);
  if (stat.isFile()) {
    if (dir.endsWith(".ts")) collected.push(dir);
    return collected;
  }

  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const entryStat = fs.statSync(full);
    if (entryStat.isDirectory() && entry !== "node_modules") {
      walkDir(full, collected);
    } else if (entryStat.isFile() && entry.endsWith(".ts")) {
      collected.push(full);
    }
  }

  return collected;
}

// ─────────────────────────────────────────────
// Analyser
// ─────────────────────────────────────────────

function auditFile(filePath: string): Issue[] {
  const issues: Issue[] = [];
  const lines = fs.readFileSync(filePath, "utf8").split("\n");
  const relPath = path.relative(process.cwd(), filePath);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip comment lines and imports
    if (
      trimmed.startsWith("//") ||
      trimmed.startsWith("*") ||
      trimmed.startsWith("import")
    ) {
      continue;
    }

    for (const pattern of LINE_PATTERNS) {
      if (pattern.fileOnly && !pattern.fileOnly.test(relPath)) continue;
      if (pattern.skipFile && pattern.skipFile.test(relPath)) continue;
      if (!pattern.regex.test(line)) continue;

      // Special check for MISSING_FRAGILE_COMMENT: skip if previous line has FRAGILE
      if (pattern.type === "MISSING_FRAGILE_COMMENT") {
        const prevLine = i > 0 ? lines[i - 1] : "";
        if (prevLine.includes("// FRAGILE") || line.includes("// FRAGILE"))
          continue;
      }

      issues.push({
        file: relPath,
        line: i + 1,
        code: trimmed.slice(0, 100),
        type: pattern.type,
        severity: pattern.severity,
        message: pattern.message,
        suggestion: pattern.suggestion,
      });
    }
  }

  return issues;
}

// ─────────────────────────────────────────────
// Reporter
// ─────────────────────────────────────────────

const ICONS: Record<Severity, string> = { HIGH: "🔴", MEDIUM: "🟡", LOW: "🔵" };
const LABELS: Record<Severity, string> = {
  HIGH: "[HIGH]  ",
  MEDIUM: "[MEDIUM]",
  LOW: "[LOW]   ",
};

function printReport(allIssues: Issue[], scanned: number): void {
  const high = allIssues.filter((i) => i.severity === "HIGH").length;
  const medium = allIssues.filter((i) => i.severity === "MEDIUM").length;
  const low = allIssues.filter((i) => i.severity === "LOW").length;

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  LOCATOR AUDIT REPORT");
  console.log(`  Files scanned : ${scanned}`);
  console.log(
    `  Total issues  : ${allIssues.length}  (🔴 ${high} high · 🟡 ${medium} medium · 🔵 ${low} low)`,
  );
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  if (allIssues.length === 0) {
    console.log("  ✅  No issues found.\n");
    return;
  }

  const sorted = [...allIssues].sort((a, b) => {
    const order: Record<Severity, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return (
      order[a.severity] - order[b.severity] ||
      a.file.localeCompare(b.file) ||
      a.line - b.line
    );
  });

  for (const issue of sorted) {
    console.log(
      `${ICONS[issue.severity]} ${LABELS[issue.severity]}  ${issue.file}:${issue.line}`,
    );
    console.log(`   ${issue.message}`);
    console.log(`   Code  : ${issue.code}`);
    console.log(`   Fix   : ${issue.suggestion}`);
    console.log();
  }
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

function main(): void {
  const args = process.argv.slice(2);
  const dirIndex = args.indexOf("--dir");
  const failOnHigh = args.includes("--fail-on-high");

  const root = process.cwd();
  const scanPaths =
    dirIndex !== -1 && args[dirIndex + 1]
      ? [path.resolve(root, args[dirIndex + 1])]
      : [path.join(root, "page-objects"), path.join(root, "tests")];

  const files: string[] = [];
  for (const p of scanPaths) walkDir(p, files);

  console.log(`\nScanning ${files.length} file(s)…`);

  const allIssues: Issue[] = [];
  for (const file of files) {
    allIssues.push(...auditFile(file));
  }

  printReport(allIssues, files.length);

  if (failOnHigh && allIssues.some((i) => i.severity === "HIGH")) {
    console.error("Exiting with code 1 — HIGH issues found (--fail-on-high)");
    process.exit(1);
  }
}

main();
