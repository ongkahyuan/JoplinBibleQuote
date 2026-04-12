import joplin from 'api';
import fs = require('fs');
import path = require('path');
import { OsisBible } from '../interfaces/osisBible';
import { NoteBible } from '../interfaces/noteBible';
import { getOsisBible } from './getOsisBible';

export async function importOsisBibleToNote(
  biblePath: string,
  folderId: string
): Promise<{ noteId?: string; errorMessage?: string }> {
  const osisResult = getOsisBible(biblePath);

  if (osisResult.errorMessage) {
    return { errorMessage: osisResult.errorMessage };
  }

  const osisBible = osisResult.osisBible;
  if (!osisBible) {
    return { errorMessage: `Could not parse OSIS bible at ${biblePath}` };
  }

  const noteBible = convertOsisToNoteBible(osisBible);

  const noteTitle = `${noteBible.osisIDWork} (Bible Quote)`;
  const noteBody = JSON.stringify(noteBible);

  try {
    const note = await joplin.data.post(['notes'], null, {
      title: noteTitle,
      body: noteBody,
      parent_id: folderId,
    });

    return { noteId: note.id };
  } catch (error) {
    return { errorMessage: `Failed to create note: ${error.message}` };
  }
}

function convertOsisToNoteBible(osisBible: OsisBible): NoteBible {
  const books: Record<string, string[][]> = {};

  for (const book of osisBible.div) {
    const bookId = book.$.osisID;
    const chapters: string[][] = [];

    for (const chapter of book.chapter) {
      const verses: string[] = [];

      for (const verse of chapter.verse) {
        let verseText = verse._ || '';
        verseText = verseText.trim();
        verseText = verseText.replace(/\n /g, '<br>----');
        verseText = verseText.replace(/\s+/g, ' ');
        verseText = verseText.replace(/----/g, '\t');
        verses.push(verseText);
      }

      chapters.push(verses);
    }

    books[bookId] = chapters;
  }

  return {
    type: 'bibleQuoteNoteBible',
    version: '1.0',
    osisIDWork: osisBible.$.osisIDWork,
    books,
  };
}

export function getAvailableOsisFiles(biblesPath: string): Array<{ name: string; path: string }> {
  if (!biblesPath || !fs.existsSync(biblesPath)) {
    return [];
  }

  const files = fs.readdirSync(biblesPath, { withFileTypes: true });
  return files
    .filter((file) => file.name.match(/.xml$/))
    .map((file) => ({
      name: file.name,
      path: path.join(biblesPath, file.name),
    }));
}
