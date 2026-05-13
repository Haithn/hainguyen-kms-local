// ─────────────────────────────────────────────
// Character Sets
// ─────────────────────────────────────────────

const ALPHANUMERIC =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const NUMERIC = "0123456789";

const WORD_LIST = [
  "apple",
  "banana",
  "cherry",
  "delta",
  "eagle",
  "falcon",
  "grape",
  "honey",
  "island",
  "jungle",
  "kiwi",
  "lemon",
  "mango",
  "nectar",
  "ocean",
  "panda",
  "quartz",
  "river",
  "sunset",
  "tiger",
  "ultra",
  "violet",
  "walnut",
  "xenon",
  "yellow",
  "zebra",
  "amber",
  "blaze",
  "cider",
  "drift",
  "ember",
  "frost",
  "gloom",
  "haven",
  "ivory",
  "jade",
  "karma",
  "lunar",
  "maple",
  "noble",
  "onyx",
  "pearl",
  "quest",
  "raven",
  "storm",
  "thorn",
  "umbra",
  "vivid",
  "waves",
  "xylem",
  "yacht",
  "zeal",
];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function pickRandom(charset: string): string {
  return charset[Math.floor(Math.random() * charset.length)];
}

function pickRandomWord(): string {
  return WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
}

// ─────────────────────────────────────────────
// String Utilities
// ─────────────────────────────────────────────

/**
 * Returns a random alphanumeric string of the given length.
 * @param length Number of characters (default: 8)
 */
export function randomAlphanumeric(length = 8): string {
  return Array.from({ length }, () => pickRandom(ALPHANUMERIC)).join("");
}

/**
 * Returns a random string composed of real words joined by spaces.
 * @param wordCount Number of words (default: 3)
 */
export function randomWords(wordCount = 3): string {
  return Array.from({ length: wordCount }, () => pickRandomWord()).join(" ");
}

/**
 * Returns a random numeric string of the given length.
 * @param length Number of digits (default: 8)
 */
export function randomNumeric(length = 8): string {
  // Ensure the first digit is never 0 so the result reads as a valid number string
  const first = NUMERIC.slice(1)[Math.floor(Math.random() * 9)];
  const rest = Array.from({ length: length - 1 }, () =>
    pickRandom(NUMERIC),
  ).join("");
  return first + rest;
}

/**
 * Returns a random email address.
 * Format: <alphanumeric>@<word>.<tld>
 * @param tld Top-level domain to use (default: 'com')
 */
export function randomEmail(tld = "com"): string {
  const local = randomAlphanumeric(8).toLowerCase();
  const domain = pickRandomWord();
  return `${local}@${domain}.${tld}`;
}
