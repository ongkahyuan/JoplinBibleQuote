import joplin from 'api';
import { handleBibleMessage, removeBibleFromCache } from '../messageHandler';

export interface BibleListItem {
  version: string;
  bookCount: number;
  sizeBytes: number;
}

const DIALOG_ID = 'bible-quote-manage-bibles';

export async function showManageBiblesDialog(): Promise<string[]> {
  const versions = await listBibles();

  if (versions.length === 0) {
    await joplin.views.dialogs.showMessageBox('No Bibles imported yet. Use "Import Bible" to add one.');
    return [];
  }

  const deletedVersions: string[] = [];
  const html = buildManageBiblesHtml(versions);

  const dialog = await joplin.views.dialogs.create(DIALOG_ID);
  await joplin.views.dialogs.setHtml(dialog, html);
  await joplin.views.dialogs.setFitToContent(dialog, true);
  await joplin.views.dialogs.setButtons(dialog, [
    { id: 'cancel' },
    { id: 'delete' }
  ]);

  let shouldClose = false;
  while (!shouldClose) {
    const result = await joplin.views.dialogs.open(dialog);

    if (result.id === 'cancel' || result.id === 'close') {
      shouldClose = true;
      continue;
    }

    if (result.id === 'delete') {
      const formData = result.formData;
      if (formData && formData.bibles) {
        const selectedVersions = Array.isArray(formData.bibles) ? formData.bibles : [formData.bibles];

        if (selectedVersions.length > 0) {
          const confirmed = await joplin.views.dialogs.showMessageBox(
            `Delete ${selectedVersions.length} Bible${selectedVersions.length > 1 ? 's' : ''}?\n\n` +
            `${selectedVersions.join(', ')}\n\n` +
            `This cannot be undone.`
          );

          if (confirmed === 0) {
            for (const version of selectedVersions) {
              await deleteBible(version);
              removeBibleFromCache(version);
              deletedVersions.push(version);
            }
            shouldClose = true;
          }
        } else {
          await joplin.views.dialogs.showMessageBox('No Bibles selected for deletion.');
        }
      } else {
        await joplin.views.dialogs.showMessageBox('No Bibles selected for deletion.');
      }
    }
  }

  return deletedVersions;
}

function buildManageBiblesHtml(bibles: BibleListItem[]): string {
  const rows = bibles.map(bible => `
    <tr>
      <td><input type="checkbox" name="bibles" value="${bible.version}" id="bible-${bible.version}"></td>
      <td><label for="bible-${bible.version}">${bible.version}</label></td>
      <td>${bible.bookCount}</td>
      <td>${formatSize(bible.sizeBytes)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 20px;
          margin: 0;
        }
        h2 {
          margin-top: 0;
          color: #333;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th, td {
          padding: 10px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        th {
          background-color: #f5f5f5;
          font-weight: 600;
        }
        tr:hover {
          background-color: #fafafa;
        }
        input[type="checkbox"] {
          width: 16px;
          height: 16px;
        }
      </style>
    </head>
    <body>
      <h2>Manage Imported Bibles</h2>
      <table>
        <thead>
          <tr>
            <th></th>
            <th>Version</th>
            <th>Books</th>
            <th>Size</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </body>
    </html>
  `;
}

async function listBibles(): Promise<BibleListItem[]> {
  const response = await handleBibleMessage({ type: 'LIST_VERSIONS' });

  if (response.type !== 'VERSIONS') {
    return [];
  }

  const items: BibleListItem[] = [];

  for (const version of response.versions) {
    const bibleResponse = await handleBibleMessage({ type: 'GET_BIBLE', version });

    if (bibleResponse.type === 'BIBLE') {
      const bodyStr = JSON.stringify(bibleResponse.data);
      items.push({
        version,
        bookCount: bibleResponse.data.books.length,
        sizeBytes: new Blob([bodyStr]).size
      });
    }
  }

  return items;
}

async function deleteBible(version: string): Promise<void> {
  const notes = await joplin.data.get(['notes'], {
    query: { tag: 'bible-data', tag2: version.toLowerCase() }
  });

  for (const note of notes.items) {
    await joplin.data.delete(['notes', note.id]);
  }

  const folders = await joplin.data.get(['folders'], {});
  const folder = folders.items.find((f: any) => f.title === `Bible Data/${version}`);
  if (folder) {
    await joplin.data.delete(['folders', folder.id]);
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
