import joplin from 'api';
import { getOsisBible } from '../utils/getOsisBible';
import { BibleNote, BookData, ChapterData, VerseData } from '../interfaces/BibleNote';

export interface ImportResult {
  success: boolean;
  version?: string;
  booksCount?: number;
  error?: string;
}

export async function importBible(osisFilePath: string, copyright?: string): Promise<ImportResult> {
  try {
    const result = getOsisBible(osisFilePath);

    if (result.errorMessage) {
      return { success: false, error: result.errorMessage };
    }

    const osisBible = result.osisBible;
    if (!osisBible) {
      return { success: false, error: 'Failed to parse OSIS Bible' };
    }

    const version = osisBible.$.osisIDWork || 'Unknown';
    const language = detectLanguage(osisBible);

    const bibleNote: BibleNote = {
      version,
      language,
      copyright: copyright || '',
      books: osisBible.div.map(convertBook)
    };

    const folderId = await ensureFolderExists(`Bible Data/${version}`);
    const existingNote = await findBibleNote(version);

    const noteBody = JSON.stringify(bibleNote);

    if (existingNote) {
      await joplin.data.put(['notes', existingNote.id], null, {
        title: `${version} Bible`,
        body: noteBody
      });
    } else {
      await joplin.data.post(['notes'], null, {
        title: `${version} Bible`,
        body: noteBody,
        parent_id: folderId,
        tags: ['bible', 'bible-data', version.toLowerCase()]
      });
    }

    return { success: true, version, booksCount: bibleNote.books.length };
  } catch (error) {
    return { success: false, error: error.message || String(error) };
  }
}

function convertBook(book: any): BookData {
  return {
    id: book.osisID || book.$.osisID,
    name: extractBookName(book),
    chapters: (book.chapter || []).map(convertChapter)
  };
}

function convertChapter(chapter: any): ChapterData {
  const osisIdParts = (chapter.osisID || chapter.$.osisID || '').split('.');
  const chapterNum = osisIdParts.length >= 2 ? parseInt(osisIdParts[1]) : 1;

  return {
    number: chapterNum,
    verses: (chapter.verse || []).map(convertVerse)
  };
}

function convertVerse(verse: any): VerseData {
  const osisIdParts = (verse.osisID || verse.$.osisID || '').split('.');
  const verseNum = osisIdParts.length >= 3 ? parseInt(osisIdParts[2]) : 1;

  return {
    number: verseNum,
    text: verse._ || verse.text || ''
  };
}

function extractBookName(book: any): string {
  if (book.osisID) return book.osisID;
  if (book.$.osisID) return book.$.osisID;

  if (book.title && book.title[0]) {
    return typeof book.title[0] === 'string' ? book.title[0] : book.title[0]._;
  }

  if (book.$.osisID) return book.$.osisID;

  return 'Unknown';
}

async function ensureFolderExists(folderPath: string): Promise<string> {
  const parts = folderPath.split('/');
  let currentPath = '';
  let parentId = '';

  for (const part of parts) {
    currentPath = currentPath ? `${currentPath}/${part}` : part;
    const folder = await findFolder(currentPath);
    if (folder) {
      parentId = folder.id;
    } else {
      const newFolder = await joplin.data.post(['folders'], null, {
        title: part,
        parent_id: parentId || undefined
      });
      parentId = newFolder.id;
    }
  }

  return parentId;
}

async function findFolder(path: string): Promise<any | null> {
  const folders = await joplin.data.get(['folders'], {});
  return folders.items.find((f: any) => f.title === path) || null;
}

async function findBibleNote(version: string): Promise<any | null> {
  const notes = await joplin.data.get(['notes'], { query: { tag: 'bible-data' } });
  return notes.items.find((n: any) => n.title === `${version} Bible`) || null;
}

function detectLanguage(osisBible: any): string {
  return 'en';
}
