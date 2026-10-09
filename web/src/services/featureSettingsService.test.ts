import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_FEATURES } from '../types';
import { featureSettingsService } from './featureSettingsService';

describe('featureSettingsService', () => {
  it('resets legacy-compatible fields to the unified navigation format', async () => {
    const update = vi.spyOn(featureSettingsService, 'update').mockResolvedValue(undefined);

    await featureSettingsService.resetToDefaults('test-user');

    expect(update).toHaveBeenCalledWith('test-user', DEFAULT_FEATURES, DEFAULT_FEATURES, []);
    update.mockRestore();
  });
});
