import { type Page } from "@playwright/test";

export type LocalStorageDiffOptions = {
  ignoreExactKeys?: string[];
  ignoreKeyPrefixes?: string[];
  compareValuesForKeys?: string[];
};

const shouldIgnoreKey = (
  key: string,
  options?: LocalStorageDiffOptions,
): boolean => {
  if (!options) {
    return false;
  }

  const exactIgnored = options.ignoreExactKeys?.includes(key) ?? false;
  if (exactIgnored) {
    return true;
  }

  return options.ignoreKeyPrefixes?.some((prefix) => key.startsWith(prefix)) ?? false;
};

/**
 * Captures a snapshot of the entire browser localStorage.
 * More efficient than calling getItem() for each key individually.
 * 
 * @returns Object with key-value pairs. Keys not present in localStorage are omitted.
 */
export const getLocalStorageSnapshot = async (
  page: Page,
): Promise<Record<string, string>> =>
  page.evaluate(() => {
    const storage: Record<string, string> = {};
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key) {
        const value = window.localStorage.getItem(key);
        if (value !== null) {
          storage[key] = value;
        }
      }
    }
    return storage;
  });

/**
 * Verifies that the specified keys are absent in the snapshot.
 * Keys may be completely missing or have empty string values.
 */
export const verifyKeysRemoved = (
  snapshot: Record<string, string>,
  keys: string[],
): void => {
  keys.forEach((key) => {
    const value = snapshot[key] ?? null;
    const isRemoved = value === null || value === "";
    if (!isRemoved) {
      throw new Error(
        `Expected localStorage key '${key}' to be removed, but found value: ${value}`,
      );
    }
  });
};

/**
 * Verifies that the specified keys remain present in the snapshot
 * if they existed in the baseline.
 * Skips verification for keys that were not present before logout.
 */
export const verifyKeysRemaining = (
  snapshot: Record<string, string>,
  keys: string[],
  baseline: Map<string, string | null>,
): void => {
  keys.forEach((key) => {
    const baselineValue = baseline.get(key) ?? null;
    const currentValue = snapshot[key] ?? null;

    // Skip if key wasn't present before logout
    if (baselineValue === null) {
      return;
    }

    // If key was present before logout, it should still be present
    if (currentValue === null) {
      throw new Error(
        `Expected localStorage key '${key}' to remain, but it was removed`,
      );
    }
  });
};

/**
 * Detects unexpected localStorage changes by comparing before/after snapshots.
 * Returns keys that were unexpectedly added or removed.
 */
export const detectUnexpectedChanges = (
  beforeSnapshot: Record<string, string>,
  afterSnapshot: Record<string, string>,
  expectedRemovals: string[],
  expectedRemaining: string[],
  options?: LocalStorageDiffOptions,
): {
  unexpectedNew: string[];
  unexpectedRemoved: string[];
  unexpectedValueChanged: string[];
} => {
  const beforeKeys = new Set(Object.keys(beforeSnapshot));
  const afterKeys = new Set(Object.keys(afterSnapshot));
  const expectedRemovalSet = new Set(expectedRemovals);
  const expectedRemainingSet = new Set(expectedRemaining);

  const unexpectedNew = [...afterKeys].filter(
    (k) =>
      !beforeKeys.has(k) &&
      !expectedRemainingSet.has(k) &&
      !expectedRemovalSet.has(k) &&
      !shouldIgnoreKey(k, options),
  );

  const unexpectedRemoved = [...beforeKeys].filter(
    (k) =>
      !afterKeys.has(k) &&
      !expectedRemovalSet.has(k) &&
      !shouldIgnoreKey(k, options),
  );

  const valueComparisonSet = new Set(options?.compareValuesForKeys ?? []);

  const unexpectedValueChanged = [...valueComparisonSet].filter((k) => {
    if (!expectedRemainingSet.has(k)) {
      return false;
    }

    if (shouldIgnoreKey(k, options)) {
      return false;
    }

    const beforeValue = beforeSnapshot[k];
    const afterValue = afterSnapshot[k];

    if (beforeValue === undefined || afterValue === undefined) {
      return false;
    }

    return beforeValue !== afterValue;
  });

  return { unexpectedNew, unexpectedRemoved, unexpectedValueChanged };
};
