/**
 * Incremental migration feature flags (§12.1, §12.4).
 *
 * Flags can be toggled at runtime via localStorage (`ff:<flagName>` = "true" | "false")
 * or at build/env level via `VITE_FF_<FLAG_NAME_UPPER>` = "true" | "false".
 * Rollback is immediate by setting the flag to `false`.
 */

export type FeatureFlagName =
  | 'domainMoneyReconciliation'
  | 'modernDashboardSlice'
  | 'modernDetailsSlice'
  | 'modernStatementSlice';

const DEFAULT_FLAGS: Readonly<Record<FeatureFlagName, boolean>> = {
  domainMoneyReconciliation: false,
  modernDashboardSlice: false,
  modernDetailsSlice: false,
  modernStatementSlice: false,
};

const STORAGE_PREFIX = 'ff:';

function toEnvKey(flag: FeatureFlagName): string {
  const snakeUpper = flag.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase();
  return `VITE_FF_${snakeUpper}`;
}

function parseBooleanOverride(raw: unknown): boolean | undefined {
  if (typeof raw === 'boolean') return raw;
  if (typeof raw !== 'string') return undefined;
  const normalized = raw.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;
  return undefined;
}

/**
 * Evaluates a feature flag with priority:
 * 1. `localStorage.getItem('ff:<flag>')` (runtime override for testing/rollback)
 * 2. `import.meta.env.VITE_FF_<FLAG>` (environment override)
 * 3. `DEFAULT_FLAGS[flag]`
 */
export function isFeatureEnabled(flag: FeatureFlagName): boolean {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(`${STORAGE_PREFIX}${flag}`);
      const parsedStored = parseBooleanOverride(stored);
      if (parsedStored !== undefined) {
        return parsedStored;
      }
    }
  } catch {
    // Ignore storage access errors (e.g. private browsing restrictions)
  }

  const envMap = import.meta.env as Record<string, unknown> | undefined;
  if (envMap) {
    const envVal = parseBooleanOverride(envMap[toEnvKey(flag)]);
    if (envVal !== undefined) {
      return envVal;
    }
  }

  return DEFAULT_FLAGS[flag];
}

/**
 * Sets or clears a runtime feature flag override in `localStorage`.
 */
export function setFeatureFlagOverride(flag: FeatureFlagName, enabled: boolean | null): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const key = `${STORAGE_PREFIX}${flag}`;
  if (enabled === null) {
    window.localStorage.removeItem(key);
  } else {
    window.localStorage.setItem(key, String(enabled));
  }
}

/**
 * Returns a snapshot of all feature flags and their resolved states.
 */
export function getAllFeatureFlags(): Record<FeatureFlagName, boolean> {
  return {
    domainMoneyReconciliation: isFeatureEnabled('domainMoneyReconciliation'),
    modernDashboardSlice: isFeatureEnabled('modernDashboardSlice'),
    modernDetailsSlice: isFeatureEnabled('modernDetailsSlice'),
    modernStatementSlice: isFeatureEnabled('modernStatementSlice'),
  };
}
