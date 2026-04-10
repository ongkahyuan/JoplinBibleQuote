import joplin from 'api';
import { BibleNote, BookData } from './interfaces/BibleNote';
import { BibleRequest, BibleResponse } from './interfaces/bibleMessages';
import { MobilePluginConfig } from './interfaces/config';
import { getPluginConfig } from './utils/getPluginConfig';

const bibleCache: Map<string, BibleNote> = new Map();

export async function handleBibleMessage(message: BibleRequest): Promise<BibleResponse> {
  switch (message.type) {
    case 'GET_VERSE':
      return await getVerse(message);
    case 'GET_BOOK':
      return await getBook(message);
    case 'LIST_VERSIONS':
      return await listVersions();
    case 'GET_BIBLE':
      return await getBible(message.version);
    case 'INIT_BIBLES':
      return await initBibles(message.versions);
    case 'GET_SETTINGS':
      return { type: 'SETTINGS', settings: getMobilePluginConfig() };
    case 'SET_DEFAULT_VERSION':
      return setDefaultVersion(message.version);
  }
}

async function getVerse(msg: { version: string; book: string; chapter: number; verse: number }): Promise<{ type: 'VERSE'; text: string }> {
  const bibleResult = await getBible(msg.version);

  if (!bibleResult) {
    const fallback = await getFallbackBible(msg.version);
    if (fallback) {
      return getVerseFromBible(fallback, msg.book, msg.chapter, msg.verse, fallback.version);
    }
    return { type: 'VERSE', text: 'ERROR: Bible not found. Please import a Bible on your desktop.' };
  }

  return getVerseFromBible(bibleResult.data, msg.book, msg.chapter, msg.verse, msg.version);
}

function getVerseFromBible(bible: BibleNote, book: string, chapter: number, verse: number, version: string): { type: 'VERSE'; text: string } {
  const bookData = bible.books.find(b =>
    b.id.toLowerCase() === book.toLowerCase() ||
    b.name.toLowerCase() === book.toLowerCase()
  );

  if (!bookData) {
    return { type: 'VERSE', text: `ERROR: Book ${book} not found in ${version}.` };
  }

  const chapterData = bookData.chapters.find(c => c.number === chapter);
  if (!chapterData) {
    return { type: 'VERSE', text: `ERROR: Chapter ${chapter} not found in ${bookData.name}.` };
  }

  const verseData = chapterData.verses.find(v => v.number === verse);
  if (!verseData) {
    return { type: 'VERSE', text: `ERROR: Verse ${verse} not found in ${bookData.name} ${chapter}.` };
  }

  return { type: 'VERSE', text: verseData.text };
}

async function getFallbackBible(excludeVersion: string): Promise<BibleNote | null> {
  const versions = await listVersions();
  const fallback = versions.versions.find(v => v !== excludeVersion);
  if (fallback) {
    const result = await getBible(fallback);
    return result?.data || null;
  }
  return null;
}

async function getBook(msg: { version: string; book: string }): Promise<{ type: 'BOOK'; data: BookData }> {
  const bibleResult = await getBible(msg.version);
  if (!bibleResult) {
    throw new Error(`Bible ${msg.version} not found`);
  }

  const bible = bibleResult.data;
  const book = bible.books.find(b =>
    b.id.toLowerCase() === msg.book.toLowerCase() ||
    b.name.toLowerCase() === msg.book.toLowerCase()
  );

  if (!book) {
    throw new Error(`Book ${msg.book} not found in ${msg.version}`);
  }

  return { type: 'BOOK', data: book };
}

async function listVersions(): Promise<{ type: 'VERSIONS'; versions: string[] }> {
  try {
    const notes = await joplin.data.get(['notes'], { query: { tag: 'bible-data' } });
    const versions = notes.items.map((n: any) => n.title.replace(' Bible', ''));
    return { type: 'VERSIONS', versions };
  } catch (e) {
    return { type: 'VERSIONS', versions: [] };
  }
}

async function getBible(version: string): Promise<{ type: 'BIBLE'; data: BibleNote } | null> {
  if (bibleCache.has(version)) {
    return { type: 'BIBLE', data: bibleCache.get(version)! };
  }

  try {
    const notes = await joplin.data.get(['notes'], {
      query: { tag: 'bible-data', tag2: version.toLowerCase() }
    });

    if (!notes.items.length) {
      return null;
    }

    const bibleNote: BibleNote = JSON.parse(notes.items[0].body);
    bibleCache.set(version, bibleNote);
    return { type: 'BIBLE', data: bibleNote };
  } catch (e) {
    console.error(`Failed to get Bible ${version}:`, e);
    return null;
  }
}

async function initBibles(versions: string[]): Promise<{ type: 'INIT_COMPLETE'; loaded: string[]; available: string[] }> {
  const loaded: string[] = [];

  for (const version of versions) {
    const bible = await getBible(version);
    if (bible) {
      loaded.push(version);
    }
  }

  const available = await listVersions();
  return { type: 'INIT_COMPLETE', loaded, available: available.versions };
}

function getMobilePluginConfig(): MobilePluginConfig {
  const config = getPluginConfig();
  return {
    defaultBibleVersion: config.defaultBibleVersion || '',
    availableVersions: config.availableVersions || [],
    verseFontSize: config.verseFontSize,
    verseAlignment: config.verseAlignment,
    bookAlignment: config.bookAlignment,
    chapterAlignment: config.chapterAlignment,
    chapterPadding: config.chapterPadding,
    language: config.language
  };
}

function setDefaultVersion(version: string): { type: 'DEFAULT_SET'; version } {
  try {
    const configStr = localStorage.getItem('bibleQuotePlugin');
    const config = configStr ? JSON.parse(configStr) : {};
    config.defaultBibleVersion = version;
    localStorage.setItem('bibleQuotePlugin', JSON.stringify(config));
  } catch (e) {
    // localStorage not available - ignore
  }
  return { type: 'DEFAULT_SET', version };
}

export function clearBibleCache(): void {
  bibleCache.clear();
}

export function removeBibleFromCache(version: string): void {
  bibleCache.delete(version);
}
