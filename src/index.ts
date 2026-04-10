import joplin from 'api';
import { bibleQuote } from './bibleQuote';
import { handleBibleMessage } from './messageHandler';
import { showManageBiblesDialog } from './dialogs/manageBibles';
import { BibleRequest } from './interfaces/bibleMessages';

joplin.plugins.register({
  onStart: async function () {
    try {
      await bibleQuote.init();
    } catch (error) {
      console.error('Bible Quote init failed:', error);
    }

    await joplin.contentScripts.onMessage('bible-quote', async (message: BibleRequest) => {
      return await handleBibleMessage(message);
    });

    joplin.commands.register({
      name: 'bible-quote.importBible',
      label: 'Import Bible (OSIS XML)',
      execute: async () => {
        try {
          const { importBible } = await import('./commands/importBible');
          const result = await joplin.views.dialogs.showOpenDialog({
            filters: [{ name: 'OSIS XML', extensions: ['xml'] }]
          });

          if (result.canceled || !result.filePaths.length) {
            return;
          }

          const filePath = result.filePaths[0];
          const importResult = await importBible(filePath);

          if (importResult.success) {
            await joplin.views.dialogs.showMessageBox(
              `Successfully imported ${importResult.version} Bible (${importResult.booksCount} books)`
            );
          } else {
            await joplin.views.dialogs.showMessageBox(`Import failed: ${importResult.error}`);
          }
        } catch (error) {
          await joplin.views.dialogs.showMessageBox(
            `Import is only available on desktop. Error: ${error.message}`
          );
        }
      }
    });

    joplin.commands.register({
      name: 'bible-quote.manageBibles',
      label: 'Manage Imported Bibles',
      execute: async () => {
        await showManageBiblesDialog();
      }
    });

    try {
      const { migrateExistingBibles } = await import('./commands/migrateBibles');
      await migrateExistingBibles();
    } catch (error) {
      console.error('Auto-migration skipped or failed:', error);
    }
  },
});
