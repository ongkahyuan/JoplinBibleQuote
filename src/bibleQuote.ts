import joplin from 'api';
import { Settings } from './settings';
import { ContentScriptType } from 'api/types';
import { availableVersions } from './generated/versions';

const loadedBibles: Record<string, any> = {};
const versionFileMap: Record<string, string> = {};

for (const v of availableVersions) {
  versionFileMap[v.value] = v.file;
}

export namespace bibleQuote {
  export async function init() {
    console.log('Bible Quote plugin started!');

    await Settings.register();

    await joplin.contentScripts.register(ContentScriptType.MarkdownItPlugin, 'bible-quote', './markdownItPlugin.js');

    await joplin.contentScripts.onMessage('bible-quote', async (message: any) => {
      if (message.type === 'getBible') {
        const version = message.version;
        if (loadedBibles[version]) return loadedBibles[version];

        const fileName = versionFileMap[version];
        if (!fileName) return { error: `Unknown bible version "${version}"` };

        try {
          const bible = joplin.require(`./generated/${fileName}`);
          if (!bible || !bible.div) {
            return { error: `Invalid bible data for "${version}"` };
          }
          loadedBibles[version] = bible;
          return bible;
        } catch (err: any) {
          return { error: `Failed to load bible "${version}": ${err.message}` };
        }
      }

      return null;
    });
  }
}
