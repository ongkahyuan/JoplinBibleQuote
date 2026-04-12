import joplin from 'api';
import { NoteBible } from '../interfaces/noteBible';

export async function getNoteBible(noteId: string): Promise<{ noteBible?: NoteBible; errorMessage?: string }> {
  try {
    const note = await joplin.data.get(['notes', noteId], { fields: ['body'] });

    if (!note || !note.body) {
      return { errorMessage: `Note ${noteId} not found or has empty body` };
    }

    let parsedBody: any;
    try {
      parsedBody = JSON.parse(note.body);
    } catch {
      return { errorMessage: `Note ${noteId} body is not valid JSON` };
    }

    if (parsedBody.type !== 'bibleQuoteNoteBible') {
      return { errorMessage: `Note ${noteId} is not a Bible Quote bible note` };
    }

    return { noteBible: parsedBody as NoteBible };
  } catch (error) {
    return { errorMessage: `Failed to load note: ${error.message}` };
  }
}
