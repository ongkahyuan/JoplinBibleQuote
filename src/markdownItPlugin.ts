import { BibleLanguage } from './interfaces/bibleIndex';
import { PluginConfig } from './interfaces/config';
import { OsisBible } from './interfaces/osisBible';
const bundledBibles: Record<string, OsisBible> = require('./generated/bibles.json');
import { availableVersions } from './generated/versions';
import { bibleIndexFull } from './languages';
import ErrorManager from './components/ErrorManager';
import Main from './components/Main';
import Help from './components/Help';
import parser from './parser';
import BibleIndex from './components/BibleIndex';

let pluginConfig: PluginConfig;
let bibleIndex: BibleLanguage;
let defaultOsisBible: OsisBible;
let osisBibles: Array<OsisBible> = [];
let bcv: any;

export default function (_context: any) {
  return {
    plugin: function (markdownIt: any, options: any) {
      const bibleVersion = options.settingValue('bibleVersion');
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
      defaultOsisBible = bundledBibles[bibleVersion];
      osisBibles = Object.values(bundledBibles);
      bcv = importBcvParser(language);

      const defaultRender =
        markdownIt.renderer.rules.fence ||
        function (tokens: any, idx: any, options: any, env: any, self: any) {
          return self.renderToken(tokens, idx, options, env, self);
        };

      markdownIt.renderer.rules.fence = function (tokens: any, idx: any, options: any, env: any, self: any) {
        const token = tokens[idx];
        if (token.info !== 'bible') return defaultRender(tokens, idx, options, env, self);

        if (!defaultOsisBible) {
          return '<div style="padding:30px;border:1px solid orange;text-align:center">Loading bible data...</div>';
        }

        const versionNames = availableVersions.map((v) => v.value);
        const parseResult = parser(token.content, bcv, versionNames);
        if (parseResult.type === 'error') return ErrorManager(parseResult.errorMessage);
        if (parseResult.type === 'help') return Help({ language: pluginConfig.language });
        if (parseResult.type === 'index')
          return BibleIndex({
            bibleIndex,
            bibleInfo: bcv.translation_info(),
            bookId: parseResult.bookId ?? undefined,
          });

        const html = Main({
          bibleIndex,
          bibleInfo: bcv.translation_info(),
          defaultOsisBible,
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
  let bcvModule: any;
  switch (citationLanguage) {
    case 'en':
      bcvModule = require('bible-passage-reference-parser/js/en_bcv_parser').bcv_parser;
      break;
    case 'es':
      bcvModule = require('bible-passage-reference-parser/js/es_bcv_parser').bcv_parser;
      break;
    case 'fr':
      bcvModule = require('bible-passage-reference-parser/js/fr_bcv_parser').bcv_parser;
      break;
    case 'zh':
      bcvModule = require('bible-passage-reference-parser/js/zh_bcv_parser').bcv_parser;
      break;
    default:
      bcvModule = require('bible-passage-reference-parser/js/en_bcv_parser').bcv_parser;
      break;
  }
  return new bcvModule();
}
