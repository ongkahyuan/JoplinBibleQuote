import { BibleLanguage } from './interfaces/bibleIndex';
import { getOsisBible } from './utils/getOsisBible';
import { getOsisBibles } from './utils/getOsisBibles';
import { getPluginConfig } from './utils/getPluginConfig';
import { bibleIndexFull } from './languages';
import ErrorManager from './components/ErrorManager';
import Main from './components/Main';
import Help from './components/Help';
import parser from './parser';
import BibleIndex from './components/BibleIndex';

let pluginConfig = getPluginConfig();
let bibleIndex: BibleLanguage = bibleIndexFull[pluginConfig.language];
let osisBibleResult = getOsisBible(pluginConfig.biblePath);
let defaultOsisBible = osisBibleResult.osisBible;
let osisBibles: Array<any> = [];
let availableVersions: string[] = [];
let bcv = importBcvParser(pluginConfig.language);
const bibleInfo = bcv.translation_info();

export default function (context: any) {
  console.log('markdownItPlugin: content script loaded');
  
  return {
    plugin: function (markdownIt: any, _options: any) {
      console.log('markdownItPlugin: plugin function called');
      
      // Load filesystem bibles synchronously (works on desktop)
      // This is a temporary solution - mobile will need postMessage
      osisBibles = getOsisBibles(pluginConfig.biblesPath);
      availableVersions = osisBibles.map((bible: any) => bible.$.osisIDWork);
      console.log('markdownItPlugin: loaded', osisBibles.length, 'bibles from filesystem');
      
      const defaultRender =
        markdownIt.renderer.rules.fence ||
        function (tokens: any, idx: number, options: any, env: any, self: any) {
          return self.renderToken(tokens, idx, options, env, self);
        };

      markdownIt.renderer.rules.fence = function (tokens: any, idx: number, options: any, env: any, self: any) {
        const token = tokens[idx];

        if (token.info !== 'bible') return defaultRender(tokens, idx, options, env, self);

        console.log('markdownItPlugin: fence rule triggered');
        console.log('markdownItPlugin: osisBibles.length =', osisBibles.length, ', availableVersions.length =', availableVersions.length);

        // If no bibles loaded yet, something is wrong
        if (osisBibles.length === 0) {
          console.error('markdownItPlugin: no bibles available!');
          return ErrorManager('No bibles loaded. Please check your settings.');
        }

        const parseResult = parser(token.content, bcv, availableVersions);
        console.log('markdownItPlugin: parseResult:', JSON.stringify(parseResult));

        if (osisBibleResult.errorMessage) return ErrorManager(osisBibleResult.errorMessage);

        if (parseResult.type === 'error') {
          return ErrorManager(parseResult.errorMessage);
        }

        if (parseResult.type === 'help') return Help({ language: pluginConfig.language });

        if (parseResult.type === 'index')
          return BibleIndex({ bibleIndex, bibleInfo, bookId: parseResult.bookId ?? undefined });

        console.log('markdownItPlugin: calling Main');
        const html = Main({
          bibleIndex,
          bibleInfo,
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
  const bcvParser: any = require(`bible-passage-reference-parser/js/${citationLanguage}_bcv_parser`).bcv_parser;
  const bcv = new bcvParser();
  return bcv;
}
