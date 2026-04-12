import joplin from 'api';

const BIBLE_FOLDER_TITLE = 'Bible Quote Bibles';

export async function ensureBibleFolder(): Promise<string> {
  const existingFolderId = await joplin.settings.value('bibleFolderId');

  if (existingFolderId) {
    try {
      await joplin.data.get(['folders', existingFolderId], { fields: ['id'] });
      return existingFolderId;
    } catch {
      // Folder no longer exists, create new one
    }
  }

  const folders = await joplin.data.get(['folders'], { fields: ['id', 'title'] });
  const existingFolder = folders.find((f: any) => f.title === BIBLE_FOLDER_TITLE);

  if (existingFolder) {
    await joplin.settings.setValue('bibleFolderId', existingFolder.id);
    return existingFolder.id;
  }

  const newFolder = await joplin.data.post(['folders'], null, {
    title: BIBLE_FOLDER_TITLE,
  });

  await joplin.settings.setValue('bibleFolderId', newFolder.id);
  return newFolder.id;
}
