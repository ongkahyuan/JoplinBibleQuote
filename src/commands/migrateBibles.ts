import joplin from 'api';
import { getOsisBiblesWithPaths } from '../utils/getOsisBibles';
import { importBible } from './importBible';
import { handleBibleMessage } from '../messageHandler';

export async function migrateExistingBibles(): Promise<void> {
  try {
    const versionsResponse = await handleBibleMessage({ type: 'LIST_VERSIONS' });
    if (versionsResponse.type === 'VERSIONS' && versionsResponse.versions.length > 0) {
      console.log('Migration skipped: Bibles already imported');
      return;
    }

    const biblesPath = await joplin.settings.value('biblesPath');
    if (!biblesPath) return;

    const osisBibles = getOsisBiblesWithPaths(biblesPath);

    if (osisBibles.length === 0) {
      console.log('Migration skipped: No OSIS Bibles found');
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

    console.log('Bible migration completed');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}
