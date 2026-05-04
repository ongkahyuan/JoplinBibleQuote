import joplin from 'api';
import { Settings } from './settings';
import { ContentScriptType } from 'api/types';
import { BibleLanguage } from './interfaces/bibleIndex';
import { OsisBible } from './interfaces/osisBible';
import { bibleIndexFull } from './languages';
import Main from './components/Main';

let biblesPromise: Promise<Record<string, OsisBible>> | null = null;

async function getBundledBibles(): Promise<Record<string, OsisBible>> {
  if (!biblesPromise) {
    biblesPromise = import(/* webpackMode: "eager" */ './generated/bibles.json').then((m: any) => m.default || m);
  }
  return biblesPromise;
}

export const contentScriptId = 'bible-quote';

export namespace bibleQuote {
  export async function init() {
    console.log('Bible Quote plugin started!');

    await Settings.register();

    await joplin.contentScripts.register(ContentScriptType.MarkdownItPlugin, contentScriptId, './markdownItPlugin.js');

    await joplin.contentScripts.onMessage(contentScriptId, async (message: any) => {
      console.log('[BibleQuote BG] onMessage received, type:', message.type);
      if (message.type === 'renderBible') {
        const { entities, pluginConfig, bibleInfo, language } = message;
        console.log('[BibleQuote BG] renderBible: language:', language, 'version:', pluginConfig?.bibleVersion);
        console.log('[BibleQuote BG] entities count:', entities?.length);
        console.log('[BibleQuote BG] bibleInfo keys:', bibleInfo ? Object.keys(bibleInfo) : 'MISSING');

        if (!bibleInfo) {
          return { error: 'bibleInfo is missing from message' };
        }
        if (!entities || !entities.length) {
          return { error: 'entities is missing or empty' };
        }

        const bibleIndex: BibleLanguage = bibleIndexFull[language] || bibleIndexFull['en'];

        let defaultOsisBible: OsisBible | undefined;
        let osisBibles: OsisBible[];
        try {
          const bundledBibles = await getBundledBibles();
          defaultOsisBible = bundledBibles[pluginConfig.bibleVersion];
          osisBibles = Object.values(bundledBibles);
        } catch (e: any) {
          console.error('[BibleQuote BG] failed to load bibles:', e.message || String(e));
          return { error: 'Failed to load bible data: ' + (e.message || String(e)) };
        }

        console.log('[BibleQuote BG] defaultOsisBible:', defaultOsisBible ? 'found' : 'NOT FOUND');
        console.log('[BibleQuote BG] osisBibles count:', osisBibles!.length);

        if (!defaultOsisBible) {
          return { error: 'Bible version not found: ' + pluginConfig.bibleVersion };
        }

        try {
          const html = Main({
            bibleIndex,
            bibleInfo,
            defaultOsisBible,
            osisBibles,
            parsedEntities: entities,
            pluginConfig,
          });
          console.log('[BibleQuote BG] renderBible success, html length:', html.length);
          return { html };
        } catch (e: any) {
          console.error('[BibleQuote BG] renderBible error:', e.message || String(e));
          return { error: e.message || String(e) };
        }
      }
      console.log('[BibleQuote BG] unknown message type:', message.type);
      return null;
    });
  }
}
