import { BibleLanguage } from './interfaces/bibleIndex';
import { bibleIndexFull } from './languages';
import ErrorManager from './components/ErrorManager';
import Main from './components/Main';
import Help from './components/Help';
import parser from './parser';
import BibleIndex from './components/BibleIndex';
import { BibleNote } from './interfaces/BibleNote';
import { MobilePluginConfig } from './interfaces/config';
import { BibleResponse } from './interfaces/bibleMessages';

let mobileConfig: MobilePluginConfig | null = null;
let language = 'en';
let bibleIndex: BibleLanguage = bibleIndexFull[language];
let bcv = importBcvParser(language);
const bibleInfo = bcv.translation_info();

let defaultVersion = '';
let loadedBibles: Map<string, BibleNote> = new Map();
let availableVersions: string[] = [];
let isInitialized = false;
let pendingRender: (() => void) | null = null;

const contentScriptId = 'bible-quote';

export default function (context: any) {
  initPlugin(context);

  return {
    plugin: function (markdownIt: any, _options: any) {
      const defaultRender =
        markdownIt.renderer.rules.fence ||
        function (tokens: any, idx: any, options: any, env: any, self: any) {
          return self.renderToken(tokens, idx, options, env, self);
        };

      markdownIt.renderer.rules.fence = function (tokens: any, idx: any, options: any, env: any, self: any) {
        const token = tokens[idx];

        if (token.info !== 'bible') return defaultRender(tokens, idx, options, env, self);

        const parseResult = parser(token.content, bcv, availableVersions);

        if (parseResult.type === 'error') return ErrorManager(parseResult.errorMessage);
        if (parseResult.type === 'help') return Help({ language });
        if (parseResult.type === 'index') return BibleIndex({ bibleIndex, bibleInfo, bookId: parseResult.bookId ?? undefined });

        if (!isInitialized || !mobileConfig) {
          return '<p>Loading Bible data...</p>';
        }

        if (loadedBibles.size === 0 && availableVersions.length === 0) {
          return '<p>No Bibles available. Please import a Bible on your desktop.</p>';
        }

        const html = Main({
          bibleIndex,
          bibleInfo,
          loadedBibles,
          availableVersions,
          parsedEntities: parseResult.entities,
          pluginConfig: mobileConfig,
          getVerseText: getVerseTextWithFallback,
        });

        return html;
      };
    },
  };
}

async function initPlugin(context: any) {
  try {
    const settingsResponse = await context.postMessage({ type: 'GET_SETTINGS' }) as BibleResponse;

    if (settingsResponse.type === 'SETTINGS') {
      mobileConfig = settingsResponse.settings;
      language = mobileConfig.language || 'en';
      bibleIndex = bibleIndexFull[language];
      bcv = importBcvParser(language);
      defaultVersion = mobileConfig.defaultBibleVersion || '';

      const initResponse = await context.postMessage({
        type: 'INIT_BIBLES',
        versions: defaultVersion ? [defaultVersion] : []
      }) as BibleResponse;

      if (initResponse.type === 'INIT_COMPLETE') {
        availableVersions = initResponse.available;
      }

      if (initResponse.type === 'INIT_COMPLETE' && initResponse.loaded.length > 0) {
        for (const version of initResponse.loaded) {
          const bibleResponse = await context.postMessage({ type: 'GET_BIBLE', version }) as BibleResponse;
          if (bibleResponse.type === 'BIBLE') {
            loadedBibles.set(version, bibleResponse.data);
          }
        }
      }
    }

    isInitialized = true;

    if (pendingRender) {
      pendingRender();
      pendingRender = null;
    }
  } catch (error) {
    console.error('Failed to initialize Bible plugin:', error);
    isInitialized = true;
  }
}

function getVerseTextWithFallback(version: string, book: string, chapter: number, verse: number): string {
  const bible = loadedBibles.get(version);

  if (!bible) {
    for (const [v, b] of loadedBibles) {
      if (v !== version) {
        const text = extractVerse(b, book, chapter, verse);
        if (text) return `[${version} not available, showing ${v}] ${text}`;
      }
    }
    return `ERROR: Bible ${version} not found. Please import a Bible on your desktop.`;
  }

  return extractVerse(bible, book, chapter, verse);
}

function extractVerse(bible: BibleNote, book: string, chapter: number, verse: number): string {
  const bookData = bible.books.find(b =>
    b.id.toLowerCase() === book.toLowerCase() ||
    b.name.toLowerCase() === book.toLowerCase()
  );

  if (!bookData) {
    return `ERROR: Book ${book} not found.`;
  }

  const chapterData = bookData.chapters.find(c => c.number === chapter);
  if (!chapterData) {
    return `ERROR: Chapter ${chapter} not found in ${bookData.name}.`;
  }

  const verseData = chapterData.verses.find(v => v.number === verse);
  if (!verseData) {
    return `ERROR: Verse ${verse} not found in ${bookData.name} ${chapter}.`;
  }

  let verseText = verseData.text.trim();
  verseText = verseText.replace(/\n /g, '<br>----');
  verseText = verseText.replace(/\s+/g, ' ');
  verseText = verseText.replace(/----/g, '\t');

  return verseText;
}

function importBcvParser(citationLanguage: string): any {
  const bcvParser: any = require(`bible-passage-reference-parser/js/${citationLanguage}_bcv_parser`).bcv_parser;
  const bcv = new bcvParser();
  return bcv;
}