import { getGlobalConfig, saveGlobalConfig } from '../utils/config.js';
import { feature } from 'bun:bundle';
import { migrateAutoUpdatesToSettings } from '../migrations/migrateAutoUpdatesToSettings.js';
import { migrateBypassPermissionsAcceptedToSettings } from '../migrations/migrateBypassPermissionsAcceptedToSettings.js';
import { migrateEnableAllProjectMcpServersToSettings } from '../migrations/migrateEnableAllProjectMcpServersToSettings.js';
import { resetProToOpusDefault } from '../migrations/resetProToOpusDefault.js';
import { migrateSonnet1mToSonnet45 } from '../migrations/migrateSonnet1mToSonnet45.js';
import { migrateLegacyOpusToCurrent } from '../migrations/migrateLegacyOpusToCurrent.js';
import { migrateSonnet45ToSonnet46 } from '../migrations/migrateSonnet45ToSonnet46.js';
import { migrateOpusToOpus1m } from '../migrations/migrateOpusToOpus1m.js';
import { migrateReplBridgeEnabledToRemoteControlAtStartup } from '../migrations/migrateReplBridgeEnabledToRemoteControlAtStartup.js';
import { resetAutoModeOptInForDefaultOffer } from '../migrations/resetAutoModeOptInForDefaultOffer.js';
import { migrateFennecToOpus } from '../migrations/migrateFennecToOpus.js';
import { migrateChangelogFromConfig } from '../utils/releaseNotes.js';

// Bump this when adding a new sync migration so existing users re-run the set.
export const CURRENT_MIGRATION_VERSION = 11;

export function runMigrations(): void {
  if (getGlobalConfig().migrationVersion !== CURRENT_MIGRATION_VERSION) {
    migrateAutoUpdatesToSettings();
    migrateBypassPermissionsAcceptedToSettings();
    migrateEnableAllProjectMcpServersToSettings();
    resetProToOpusDefault();
    migrateSonnet1mToSonnet45();
    migrateLegacyOpusToCurrent();
    migrateSonnet45ToSonnet46();
    migrateOpusToOpus1m();
    migrateReplBridgeEnabledToRemoteControlAtStartup();
    if (feature('TRANSCRIPT_CLASSIFIER')) {
      resetAutoModeOptInForDefaultOffer();
    }
    if ("external" === 'ant') {
      migrateFennecToOpus();
    }
    saveGlobalConfig(prev => prev.migrationVersion === CURRENT_MIGRATION_VERSION ? prev : {
      ...prev,
      migrationVersion: CURRENT_MIGRATION_VERSION
    });
  }
  // Async migration - fire and forget since it's non-blocking
  migrateChangelogFromConfig().catch(() => {
    // Silently ignore migration errors - will retry on next startup
  });
}
