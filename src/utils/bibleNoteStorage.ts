  import joplin from 'api';
  import path = require('path');
  import { getOsisBibles } from './getOsisBibles';
  
  async function deleteBibleQuoteFolder(): Promise<void> {
    console.log('deleteBibleQuoteFolder: fetching all folders');
    const foldersResult = await joplin.data.get(['folders']);
    console.log(`deleteBibleQuoteFolder: folders result: ${JSON.stringify(foldersResult)}`);
    const folders = foldersResult.items;
    console.log(`deleteBibleQuoteFolder: found ${folders?.length} total folders`);
    if (!folders) return;
    for (const folder of folders) {
      console.log(`deleteBibleQuoteFolder: checking folder "${folder.title}"`);
      if (folder.title === 'BibleQuote') {
        console.log(`deleteBibleQuoteFolder: deleting folder ${folder.id}`);
        await joplin.data.delete(['folders', folder.id]);
        console.log('deleteBibleQuoteFolder: deleted');
        break;
      }
    }
  }

  async function createBibleQuoteFolder(): Promise<string> {
    console.log('createBibleQuoteFolder: creating new folder');
    const result = await joplin.data.post(['folders'], null, { title: 'BibleQuote' });
    console.log(`createBibleQuoteFolder: created folder ${result.id}`);
    return result.id;
  }

  async function createBibleNotes(osisBibles: any[], parentId: string): Promise<void> {
    console.log(`createBibleNotes: creating ${osisBibles.length} notes under parent ${parentId}`);
    for (const bible of osisBibles) {
      const osisId = bible.$?.osisIDWork || 'Unknown';
      console.log(`createBibleNotes: creating note "${osisId}"`);
      await joplin.data.post(['notes'], null, { title: osisId, parent_id: parentId });
    }
    console.log('createBibleNotes: finished');
  }

  export async function importBiblesMobile(): Promise<void> {
    console.log('importBiblesMobile: starting import');
    await deleteBibleQuoteFolder();
    const folderId = await createBibleQuoteFolder();

    let biblesPath = await joplin.settings.value('biblesPath');
    console.log(`importBiblesMobile: biblesPath = "${biblesPath}"`);
    if (!biblesPath) {
      biblesPath = await joplin.settings.value('biblePath');
      console.log(`importBiblesMobile: biblePath = "${biblesPath}" (fallback)`);
    }

    if (!biblesPath) {
      console.log('importBiblesMobile: No bibles path configured');
      return;
    }

    const normalizedPath = path.normalize(biblesPath);
    console.log(`importBiblesMobile: normalizedPath = "${normalizedPath}"`);
    const osisBibles = getOsisBibles(normalizedPath);
    console.log(`importBiblesMobile: found ${osisBibles.length} OSIS bibles`);
    await createBibleNotes(osisBibles, folderId);
    console.log('importBiblesMobile: import complete');
  }