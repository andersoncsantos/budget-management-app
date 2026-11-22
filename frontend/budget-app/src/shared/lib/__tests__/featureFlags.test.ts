import { describe, it, expect, beforeEach } from 'vitest';
import {
  isFeatureEnabled,
  setFeatureFlagOverride,
  getAllFeatureFlags,
} from '../featureFlags';

describe('featureFlags', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns default false for unconfigured flags', () => {
    expect(isFeatureEnabled('domainMoneyReconciliation')).toBe(false);
    expect(isFeatureEnabled('modernDashboardSlice')).toBe(false);
    expect(isFeatureEnabled('modernDetailsSlice')).toBe(false);
    expect(isFeatureEnabled('modernStatementSlice')).toBe(false);
  });

  it('respects runtime localStorage overrides and supports rollback', () => {
    setFeatureFlagOverride('modernDashboardSlice', true);
    expect(isFeatureEnabled('modernDashboardSlice')).toBe(true);

    // Instant rollback
    setFeatureFlagOverride('modernDashboardSlice', false);
    expect(isFeatureEnabled('modernDashboardSlice')).toBe(false);

    // Clear override
    setFeatureFlagOverride('modernDashboardSlice', null);
    expect(isFeatureEnabled('modernDashboardSlice')).toBe(false);
  });

  it('returns all resolved flag states in getAllFeatureFlags()', () => {
    setFeatureFlagOverride('domainMoneyReconciliation', true);
    expect(getAllFeatureFlags()).toEqual({
      domainMoneyReconciliation: true,
      modernDashboardSlice: false,
      modernDetailsSlice: false,
      modernStatementSlice: false,
    });
  });
});
