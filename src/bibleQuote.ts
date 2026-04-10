import joplin from 'api';
import { Settings } from './settings';
import { ContentScriptType } from 'api/types';

function safeGetLocalStorage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch (e) {
    return null;
  }
}

export namespace bibleQuote {
  export async function init() {
    console.log('Bible Quote plugin started!');

    await Settings.register();

    const storage = safeGetLocalStorage();
    if (storage) {
      storage.setItem('bibleQuotePlugin', JSON.stringify({}));
      for (const setting in Settings.settings) {
        await updateSetting(setting);
      }
    }

    joplin.settings.onChange(async (event: any) => {
      await bibleQuote.settingsChanged(event);
    });

    await joplin.contentScripts.register(ContentScriptType.MarkdownItPlugin, 'bible-quote', './markdownItPlugin.js');
  }

  export async function settingsChanged(event: any) {
    for (let key of event.keys) {
      await updateSetting(key);
    }
  }

  export async function updateSetting(setting: string): Promise<void> {
    const storage = safeGetLocalStorage();
    if (!storage) return;

    try {
      storage.setItem('bibleQuoteSettingsUpdated', 'true');
      const configStr = storage.getItem('bibleQuotePlugin');
      const localStorageConfig = configStr ? JSON.parse(configStr) : {};

      let value = await joplin.settings.value(setting);

      if (Settings.pathSettings.includes(setting)) {
        if (typeof value === 'undefined') value = '';
      }

      localStorageConfig[setting] = value;

      if (setting === 'defaultBibleVersion') {
        localStorageConfig.defaultBibleVersion = value;
      }

      storage.setItem('bibleQuotePlugin', JSON.stringify(localStorageConfig));
    } catch (error) {
      console.warn('Failed to update localStorage settings:', error);
    }
  }

}