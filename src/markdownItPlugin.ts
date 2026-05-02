import { BibleLanguage } from './interfaces/bibleIndex';
import { PluginConfig } from './interfaces/config';
import { OsisBible } from './interfaces/osisBible';
import { availableVersions } from './generated/versions';
import { bibleIndexFull } from './languages';
import ErrorManager from './components/ErrorManager';
import Main from './components/Main';
import Help from './components/Help';
import parser from './parser';
import BibleIndex from './components/BibleIndex';

let pluginConfig: PluginConfig;
let bibleIndex: BibleLanguage;
let defaultOsisBible: OsisBible | null = null;
let osisBibles: Array<OsisBible> = [];
let bcv: any;
let context: any;

const loadedBibles: Record<string, OsisBible> = {};
const pendingRequests: Record<string, Promise<OsisBible | null>> = {};

function requestBible(version: string): Promise<OsisBible | null> {
  if (loadedBibles[version]) return Promise.resolve(loadedBibles[version]);
  if (pendingRequests[version]) return pendingRequests[version];

  pendingRequests[version] = context
    .postMessage({ type: 'getBible', version })
    .then((response: any) => {
      if (response && !response.error && response.div) {
        loadedBibles[version] = response;
        return response;
      }
      return null;
    })
    .catch(() => null)
    .finally(() => {
      delete pendingRequests[version];
    });

  return pendingRequests[version];
}

function getDefaultOsisBible(): OsisBible | null {
  if (!defaultOsisBible) {
    defaultOsisBible = loadedBibles[pluginConfig.bibleVersion] || null;
  }
  return defaultOsisBible;
}

export default function (_context: any) {
  context = _context;

  return {
    plugin: function (markdownIt: any, options: any) {
      const bibleVersion = options.settingValue('bibleVersion') || availableVersions[0]?.value || '';
      const language = options.settingValue('language') || 'en';

      pluginConfig = {
        bibleVersion,
        language,
        verseFontSize: options.settingValue('verseFontSize') || 16,
        verseAlignment: options.settingValue('verseAlignment') || 'justify',
        bookAlignment: options.settingValue('bookAlignment') || 'center',
        chapterAlignment: options.settingValue('chapterAlignment') || 'left',
        chapterPadding: options.settingValue('chapterPadding') || 10,
      };

      bibleIndex = bibleIndexFull[language] || bibleIndexFull['en'];
      bcv = importBcvParser(language);

      requestBible(bibleVersion).then((bible) => {
        if (bible) defaultOsisBible = bible;
      });

      const defaultRender =
        markdownIt.renderer.rules.fence ||
        function (tokens: any, idx: any, options: any, env: any, self: any) {
          return self.renderToken(tokens, idx, options, env, self);
        };

      markdownIt.renderer.rules.fence = function (tokens: any, idx: any, options: any, env: any, self: any) {
        const token = tokens[idx];
        if (token.info !== 'bible') return defaultRender(tokens, idx, options, env, self);

        const currentDefault = getDefaultOsisBible();
        if (!currentDefault) return '';

        const versionNames = availableVersions.map((v) => v.value);
        const parseResult = parser(token.content, bcv, versionNames);
        if (parseResult.type === 'error') return ErrorManager(parseResult.errorMessage);
        if (parseResult.type === 'help') return Help({ language: pluginConfig.language });
        if (parseResult.type === 'index')
          return BibleIndex({ bibleIndex, bibleInfo: bcv.translation_info(), bookId: parseResult.bookId ?? undefined });

        osisBibles = availableVersions.map((v) => loadedBibles[v.value]).filter(Boolean) as Array<OsisBible>;

        const html = Main({
          bibleIndex,
          bibleInfo: bcv.translation_info(),
          defaultOsisBible: currentDefault,
          osisBibles,
          parsedEntities: parseResult.entities,
          pluginConfig,
        });
        return html;
      };
    },
  };
}

function importBcvParser(citationLanguage: string): any {
  const bcvParser: any = require(`bible-passage-reference-parser/js/${citationLanguage}_bcv_parser`).bcv_parser;
  return new bcvParser();
}
