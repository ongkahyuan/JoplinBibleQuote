import joplin from 'api';
import { NoteBible } from '../interfaces/noteBible';
import { getNoteBible } from './getNoteBible';

export interface NoteBibleWithId extends NoteBible {
  noteId: string;
}

export async function getNoteBibles(): Promise<{ noteBibles: NoteBibleWithId[] }> {
  const folderId = await joplin.settings.value('bibleFolderId');

  if (!folderId) {
    return { noteBibles: [] };
  }

  try {
    const notes = await joplin.data.get(['folders', folderId, 'notes'], { fields: ['id', 'body'] });

    const noteBibles: NoteBibleWithId[] = [];

    for (const note of notes) {
      if (!note.body) continue;

      try {
        const parsed = JSON.parse(note.body);
        if (parsed.type === 'bibleQuoteNoteBible') {
          noteBibles.push({
            ...parsed,
            noteId: note.id,
          });
        }
      } catch {
        // Skip notes that aren't valid JSON
      }
    }

    return { noteBibles };
  } catch {
    return { noteBibles: [] };
  }
}
