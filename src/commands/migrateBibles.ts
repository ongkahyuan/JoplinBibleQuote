import joplin from 'api';
import { getOsisBiblesWithPaths } from '../utils/getOsisBibles';
import { importBible } from './importBible';
import { handleBibleMessage } from '../messageHandler';

const MIGRATED_SETTING = 'bibleQuoteMigratedToNotes';

export async function migrateExistingBibles(): Promise<void> {
  try {
    const alreadyMigrated = await joplin.settings.value(MIGRATED_SETTING);
    if (alreadyMigrated) return;

    const biblesPath = await joplin.settings.value('biblesPath');
    if (!biblesPath) return;

    const osisBibles = getOsisBiblesWithPaths(biblesPath);

    if (osisBibles.length === 0) {
      await joplin.settings.setValue(MIGRATED_SETTING, true);
      return;
    }

    for (const { path: filePath, osisBible } of osisBibles) {
      const version = osisBible.$.osisIDWork;
      console.log(`Migrating Bible: ${version} from ${filePath}`);

      const result = await importBible(filePath);

      if (result.success) {
        console.log(`Successfully migrated ${version}: ${result.booksCount} books`);
      } else {
        console.error(`Failed to migrate ${version}: ${result.error}`);
      }
    }

    await joplin.settings.setValue(MIGRATED_SETTING, true);
    console.log('Bible migration completed');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

export async function isMigrationNeeded(): Promise<boolean> {
  try {
    const alreadyMigrated = await joplin.settings.value(MIGRATED_SETTING);
    if (alreadyMigrated) return false;

    const versionsResponse = await handleBibleMessage({ type: 'LIST_VERSIONS' });
    if (versionsResponse.type !== 'VERSIONS') return true;

    const biblesPath = await joplin.settings.value('biblesPath');
    if (!biblesPath) return false;

    return true;
  } catch {
    return false;
  }
}
