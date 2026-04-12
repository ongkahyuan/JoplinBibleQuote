import { BibleLanguage } from './interfaces/bibleIndex';
import { OsisBible } from './interfaces/osisBible';
import { NoteBible } from './interfaces/noteBible';
import { getOsisBible } from './utils/getOsisBible';
import { getOsisBibles } from './utils/getOsisBibles';
import { getNoteBible } from './utils/getNoteBible';
import { getNoteBibles } from './utils/getNoteBibles';
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
let osisBibles = getOsisBibles(pluginConfig.biblesPath);
let availableVersions = osisBibles.map((bible) => bible.$.osisIDWork);
let bcv = importBcvParser(pluginConfig.language);
const bibleInfo = bcv.translation_info();

let defaultNoteBible: NoteBible | null = null;
let noteBibles: Array<NoteBible> = [];
let noteLoadingPromise: Promise<void> | null = null;

async function loadNoteBibles() {
  if (noteLoadingPromise) return noteLoadingPromise;

  noteLoadingPromise = (async () => {
    const defaultNoteBibleId = pluginConfig.defaultNoteBibleId;

    if (defaultNoteBibleId) {
      const result = await getNoteBible(defaultNoteBibleId);
      if (result.noteBible) {
        defaultNoteBible = result.noteBible;
        availableVersions = [result.noteBible.osisIDWork];
      }
    }

    const noteBiblesResult = await getNoteBibles();
    noteBibles = noteBiblesResult.noteBibles;
  })();

  return noteLoadingPromise;
}

export default function (context) {
  return {
    plugin: async function (markdownIt, _options) {
      const defaultRender =
        markdownIt.renderer.rules.fence ||
        function (tokens, idx, options, env, self) {
          return self.renderToken(tokens, idx, options, env, self);
        };

      markdownIt.renderer.rules.fence = async function (tokens, idx, options, env, self) {
        const token = tokens[idx];

        if (token.info !== 'bible') return defaultRender(tokens, idx, options, env, self);

        if (localStorage.getItem('bibleQuoteSettingsUpdated') === 'true') {
          localStorage.setItem('bibleQuoteSettingsUpdated', 'false');
          pluginConfig = getPluginConfig();
          bibleIndex = bibleIndexFull[pluginConfig.language];
          bcv = importBcvParser(pluginConfig.language);

          defaultNoteBible = null;
          noteBibles = [];
          noteLoadingPromise = null;

          if (pluginConfig.defaultNoteBibleId) {
            await loadNoteBibles();
          }

          if (!pluginConfig.defaultNoteBibleId) {
            osisBibleResult = getOsisBible(pluginConfig.biblePath);
            defaultOsisBible = osisBibleResult.osisBible;
            osisBibles = getOsisBibles(pluginConfig.biblesPath);
            availableVersions = osisBibles.map((bible) => bible.$.osisIDWork);
          }
        }

        if (pluginConfig.defaultNoteBibleId && !defaultNoteBible) {
          await loadNoteBibles();
        }

        const usingNoteBible = !!defaultNoteBible;
        const hasOsisError = !usingNoteBible && !!osisBibleResult.errorMessage;

        if (hasOsisError) return ErrorManager(osisBibleResult.errorMessage);

        const parseResult = parser(token.content, bcv, availableVersions);

        if (parseResult.type === 'error') return ErrorManager(parseResult.errorMessage);

        if (parseResult.type === 'help') return Help({ language: pluginConfig.language });

        if (parseResult.type === 'index')
          return BibleIndex({ bibleIndex, bibleInfo, bookId: parseResult.bookId ?? undefined });

        const html = Main({
          bibleIndex,
          bibleInfo,
          defaultOsisBible: usingNoteBible ? null : defaultOsisBible,
          osisBibles: usingNoteBible ? [] : osisBibles,
          defaultNoteBible: usingNoteBible ? defaultNoteBible : null,
          noteBibles: usingNoteBible ? noteBibles : [],
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
