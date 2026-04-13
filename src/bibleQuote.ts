import path = require('path');
import joplin from 'api';
import { Settings } from './settings';
import { ContentScriptType } from 'api/types';
import { importBiblesMobile } from './utils/bibleNoteStorage'
import { getOsisBiblesFromNote } from './utils/getOsisBiblesFromNote';
import { getOsisBibles } from './utils/getOsisBibles';


export namespace bibleQuote {
  export async function init() {
    console.log('Biblie Quote plugin started!');

    await Settings.register();

    // Save the plugins settings to localStorage to be available to the markdownItPlugin
    localStorage.setItem('bibleQuotePlugin', JSON.stringify({}));
    for (const setting in Settings.settings) {
      await updateSetting(setting);
    }

    // Save the changed settings to localStorage
    joplin.settings.onChange(async (event: any) => {
      await bibleQuote.settingsChanged(event);
    });

    await joplin.contentScripts.register(ContentScriptType.MarkdownItPlugin, 'bible-quote', './markdownItPlugin.js');

    joplin.contentScripts.onMessage('bible-quote', async (message: any) => {
      console.log('bibleQuote: received message from content script:', JSON.stringify(message));
      if (message.type === 'getBibles') {
        const { id } = message;
        const importBiblesMobile = await joplin.settings.value('importBiblesMobile');
        const biblesImportFolder = await joplin.settings.value('biblesImportFolder');
        console.log(`bibleQuote: importBiblesMobile=${importBiblesMobile}, biblesImportFolder=${biblesImportFolder}`);
        
        let bibles: any[];
        if (importBiblesMobile === 'Yes') {
          console.log('bibleQuote: loading bibles from notes');
          bibles = await getOsisBiblesFromNote(biblesImportFolder);
        } else {
          console.log('bibleQuote: loading bibles from filesystem');
          const biblesPath = await joplin.settings.value('biblesPath');
          bibles = getOsisBibles(biblesPath);
        }
        const versions = bibles.map((b: any) => b.$.osisIDWork);
        console.log(`bibleQuote: returning ${bibles.length} bibles with versions: ${versions.join(', ')}`);
        
        const pluginConfig = {
          importBiblesMobile,
          biblesImportFolder,
          language: await joplin.settings.value('language'),
          biblePath: await joplin.settings.value('biblePath'),
          biblesPath: await joplin.settings.value('biblesPath'),
          verseAlignment: await joplin.settings.value('verseAlignment'),
          bookAlignment: await joplin.settings.value('bookAlignment'),
          chapterAlignment: await joplin.settings.value('chapterAlignment'),
          chapterPadding: await joplin.settings.value('chapterPadding'),
          verseFontSize: await joplin.settings.value('verseFontSize'),
        };
        
        return { id, bibles, versions, pluginConfig };
      }
      return null;
    });
  }

  /**
   * Saves the changed settings to localStorage
   * @param event
   */
  export async function settingsChanged(event: any) {
    for (let key of event.keys) {
      await updateSetting(key);
      if (key === 'importBiblesMobile') {
        const value = await joplin.settings.value('importBiblesMobile');
        if (value === 'Yes') {
          await importBiblesMobile();
        }
      }
    }
  }


  /**
   * Saves a setting to the localStorage
   * @param setting
   */
  export async function updateSetting(setting: string): Promise<void> {
    localStorage.setItem('bibleQuoteSettingsUpdated', 'true');
    const localStorageConfig = JSON.parse(localStorage.getItem('bibleQuotePlugin'));

    let value = await joplin.settings.value(setting);

    // If the setting is a path normalize it before saving to localStorage
    if (Settings.pathSettings.includes(setting)) {
      if (typeof value === 'undefined') value = '';
      value = path.normalize(value);
    }

    localStorageConfig[setting] = value;
    localStorage.setItem('bibleQuotePlugin', JSON.stringify(localStorageConfig));
  }
}
