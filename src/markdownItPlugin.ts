import { BibleLanguage } from './interfaces/bibleIndex';
import { PluginConfig } from './interfaces/config';
import parser from './parser';
import ErrorManager from './components/ErrorManager';
import Help from './components/Help';
import BibleIndexComponent from './components/BibleIndex';
import { bibleIndexFull } from './languages';
import { availableVersions } from './generated/versions';

export default function (context: any) {
  const contentScriptId = context.contentScriptId;

  return {
    plugin: function (markdownIt: any, options: any) {
      const bibleVersion = options.settingValue('bibleVersion');
      const language = options.settingValue('language') || 'en';

      const pluginConfig: PluginConfig = {
        bibleVersion,
        language,
        verseFontSize: options.settingValue('verseFontSize') || 16,
        verseAlignment: options.settingValue('verseAlignment') || 'justify',
        bookAlignment: options.settingValue('bookAlignment') || 'center',
        chapterAlignment: options.settingValue('chapterAlignment') || 'left',
        chapterPadding: options.settingValue('chapterPadding') || 10,
      };

      const bibleIndex: BibleLanguage = bibleIndexFull[language] || bibleIndexFull['en'];
      const bcv = importBcvParser(language);
      const bibleInfo = bcv.translation_info();
      const versionNames = availableVersions.map((v) => v.value);

      const defaultRender =
        markdownIt.renderer.rules.fence ||
        function (tokens: any, idx: any, options: any, env: any, self: any) {
          return self.renderToken(tokens, idx, options, env, self);
        };

      markdownIt.renderer.rules.fence = function (tokens: any, idx: any, options: any, env: any, self: any) {
        const token = tokens[idx];
        if (token.info !== 'bible') return defaultRender(tokens, idx, options, env, self);

        const parseResult = parser(token.content, bcv, versionNames);
        if (parseResult.type === 'error') return ErrorManager(parseResult.errorMessage);
        if (parseResult.type === 'help') return Help({ language: pluginConfig.language });
        if (parseResult.type === 'index')
          return BibleIndexComponent({
            bibleIndex,
            bibleInfo,
            bookId: parseResult.bookId ?? undefined,
          });

        let data: string;
        try {
          data = JSON.stringify({
            entities: parseResult.entities,
            pluginConfig,
            bibleInfo,
            language,
            defaultVersion: bibleVersion,
            contentScriptId,
          });
        } catch (e: any) {
          const errMsg = 'Error serializing bible data: ' + (e.message || String(e));
          console.error('[BibleQuote MD]', errMsg);
          return '<div style="padding:30px;border:1px solid red;text-align:center">' + errMsg + '</div>';
        }

        const encodedData = encodeURIComponent(data);
        console.log('[BibleQuote MD] Generated placeholder, data size:', data.length, 'bytes');

        return (
          '<div class="bible-quote-placeholder" data-bible-data="' +
          encodedData +
          '">' +
          '<div style="padding:30px;border:1px solid orange;text-align:center">Loading bible verses...</div>' +
          '</div>'
        );
      };
    },

    assets: () => [{ name: './viewer.js' }],
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
