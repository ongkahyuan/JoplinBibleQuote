import joplin from 'api';
import { handleBibleMessage, removeBibleFromCache } from '../messageHandler';

export interface BibleListItem {
  version: string;
  bookCount: number;
  sizeBytes: number;
  isDefault: boolean;
}

const DIALOG_ID = 'bible-quote-manage-bibles';

export async function showManageBiblesDialog(): Promise<string[]> {
  const currentDefault = await joplin.settings.value('defaultBibleVersion');
  const versions = await listBibles(currentDefault);

  if (versions.length === 0) {
    await joplin.views.dialogs.showMessageBox('No Bibles imported yet. Use "Import Bible" to add one.');
    return [];
  }

  const deletedVersions: string[] = [];
  let html = buildManageBiblesHtml(versions);

  const dialog = await joplin.views.dialogs.create(DIALOG_ID);
  await joplin.views.dialogs.setHtml(dialog, html);
  await joplin.views.dialogs.setFitToContent(dialog, true);
  await joplin.views.dialogs.setButtons(dialog, [
    { id: 'cancel', title: 'Cancel' },
    { id: 'setDefault', title: 'Set Default' },
    { id: 'deleteSelected', title: 'Delete Selected' }
  ]);

  let shouldClose = false;
  while (!shouldClose) {
    const result = await joplin.views.dialogs.open(dialog);

    if (result.id === 'cancel' || result.id === 'close') {
      shouldClose = true;
      continue;
    }

    if (result.id === 'setDefault') {
      const formData = result.formData;
      const selectedDefault = formData?.defaultBible;

      if (!selectedDefault) {
        await joplin.views.dialogs.showMessageBox('Select a Bible to set as default.');
        html = buildManageBiblesHtml(versions);
        await joplin.views.dialogs.setHtml(dialog, html);
        continue;
      }

      await joplin.settings.setValue('defaultBibleVersion', selectedDefault);
      await handleBibleMessage({ type: 'SET_DEFAULT_VERSION', version: selectedDefault });

      versions.forEach(v => v.isDefault = v.version === selectedDefault);
      html = buildManageBiblesHtml(versions);
      await joplin.views.dialogs.setHtml(dialog, html);

      await joplin.views.dialogs.showMessageBox(`Default Bible set to ${selectedDefault}`);
    }

    if (result.id === 'deleteSelected') {
      const formData = result.formData;
      if (formData && formData.biblesToDelete) {
        const selectedVersions = Array.isArray(formData.biblesToDelete) ? formData.biblesToDelete : [formData.biblesToDelete];

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

            const newVersions = versions.filter(v => !deletedVersions.includes(v.version));
            if (newVersions.length === 0) {
              shouldClose = true;
            } else {
              html = buildManageBiblesHtml(newVersions);
              await joplin.views.dialogs.setHtml(dialog, html);
            }
          } else {
            html = buildManageBiblesHtml(versions);
            await joplin.views.dialogs.setHtml(dialog, html);
          }
        } else {
          await joplin.views.dialogs.showMessageBox('Select Bibles to delete.');
        }
      } else {
        await joplin.views.dialogs.showMessageBox('Select Bibles to delete.');
      }
    }
  }

  return deletedVersions;
}

function buildManageBiblesHtml(bibles: BibleListItem[]): string {
  const rows = bibles.map(bible => `
    <tr class="${bible.isDefault ? 'default-row' : ''}">
      <td>
        <input type="radio" name="defaultBible" value="${bible.version}"
               id="default-${bible.version}" ${bible.isDefault ? 'checked' : ''}>
      </td>
      <td><label for="default-${bible.version}">${bible.version}</label></td>
      <td>${bible.bookCount}</td>
      <td>${formatSize(bible.sizeBytes)}</td>
      <td style="text-align: center;">
        <input type="checkbox" name="biblesToDelete" value="${bible.version}"
               id="delete-${bible.version}">
      </td>
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
        tr.default-row {
          background-color: #e8f4e8;
        }
        input[type="radio"], input[type="checkbox"] {
          width: 16px;
          height: 16px;
          cursor: pointer;
        }
        td:nth-child(5) {
          text-align: center;
        }
        .instructions {
          font-size: 14px;
          color: #666;
          margin-bottom: 15px;
        }
      </style>
    </head>
    <body>
      <h2>Manage Imported Bibles</h2>
      <p class="instructions">Select a radio button to set default. Check boxes to select for deletion.</p>
      <table>
        <thead>
          <tr>
            <th>Default</th>
            <th>Version</th>
            <th>Books</th>
            <th>Size</th>
            <th>Delete</th>
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

async function listBibles(currentDefault: string): Promise<BibleListItem[]> {
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
        sizeBytes: new Blob([bodyStr]).size,
        isDefault: version === currentDefault
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