import path = require('path');
import joplin from 'api';
import { Settings } from './settings';
import { ContentScriptType } from 'api/types';
import { importOsisBibleToNote } from './utils/importOsisBibleToNote';
import { ensureBibleFolder } from './utils/ensureBibleFolder';
import { getAvailableOsisFiles } from './utils/importOsisBibleToNote';

export namespace bibleQuote {
  export async function init() {
    console.log('Biblie Quote plugin started!');

    await Settings.register();

    await ensureBibleFolder();

    await registerCommands();

    localStorage.setItem('bibleQuotePlugin', JSON.stringify({}));
    for (const setting in Settings.settings) {
      await updateSetting(setting);
    }

    joplin.settings.onChange(async (event: any) => {
      await bibleQuote.settingsChanged(event);
    });

    await joplin.contentScripts.register(ContentScriptType.MarkdownItPlugin, 'bible-quote', './markdownItPlugin.js');
  }

  async function registerCommands() {
    await joplin.commands.register({
      name: 'bibleQuote.importBible',
      label: 'Bible Quote: Import OSIS Bible to Note',
      execute: async () => {
        await handleImportBibleCommand();
      },
    });
  }

  async function handleImportBibleCommand() {
    const dialog = require('api').joplin.views.dialogs;
    const biblesPath = await joplin.settings.value('biblesPath');

    let availableFiles: Array<{ name: string; path: string }> = [];
    if (biblesPath) {
      availableFiles = getAvailableOsisFiles(biblesPath);
    }

    const result = await dialog.showOpenDialog({
      title: availableFiles.length > 0
        ? `Select OSIS Bible to Import (${availableFiles.length} files found in biblesPath)`
        : 'Select OSIS Bible File to Import',
      filters: [{ name: 'OSIS XML Files', extensions: ['xml'] }],
      properties: ['openFile'],
    });

    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return;
    }

    const biblePath = result.filePaths[0];
    const folderId = await joplin.settings.value('bibleFolderId');

    if (!folderId) {
      await dialog.showMessageBox('Bible folder not found. Please restart the plugin.');
      return;
    }

    const importResult = await importOsisBibleToNote(biblePath, folderId);

    if (importResult.errorMessage) {
      await dialog.showMessageBox(`Import failed: ${importResult.errorMessage}`);
      return;
    }

    await joplin.settings.setValue('defaultNoteBibleId', importResult.noteId);
    await updateSetting('defaultNoteBibleId');

    await dialog.showMessageBox(`Successfully imported bible! Note ID: ${importResult.noteId}`);
  }

  export async function settingsChanged(event: any) {
    for (let key of event.keys) {
      if (key === 'importBiblePath') {
        const importPath = await joplin.settings.value('importBiblePath');
        if (importPath) {
          await handleImportBible(importPath);
        }
      } else {
        await updateSetting(key);
      }
    }
  }

  async function handleImportBible(biblePath: string) {
    const dialog = require('api').joplin.views.dialogs;
    const folderId = await joplin.settings.value('bibleFolderId');

    if (!folderId) {
      await dialog.showMessageBox('Bible folder not found. Please restart the plugin.');
      return;
    }

    const importResult = await importOsisBibleToNote(biblePath, folderId);

    if (importResult.errorMessage) {
      await dialog.showMessageBox(`Import failed: ${importResult.errorMessage}`);
      return;
    }

    await joplin.settings.setValue('defaultNoteBibleId', importResult.noteId);
    await joplin.settings.setValue('importBiblePath', '');
    await updateSetting('defaultNoteBibleId');
    await updateSetting('importBiblePath');

    await dialog.showMessageBox(`Successfully imported bible! Note ID: ${importResult.noteId}`);
  }

  export async function updateSetting(setting: string): Promise<void> {
    localStorage.setItem('bibleQuoteSettingsUpdated', 'true');
    const localStorageConfig = JSON.parse(localStorage.getItem('bibleQuotePlugin'));

    let value = await joplin.settings.value(setting);

    if (Settings.pathSettings.includes(setting)) {
      if (typeof value === 'undefined') value = '';
      value = path.normalize(value);
    }

    if (Settings.noteSettings.includes(setting)) {
      if (typeof value === 'undefined') value = '';
    }

    localStorageConfig[setting] = value;
    localStorage.setItem('bibleQuotePlugin', JSON.stringify(localStorageConfig));
  }
}
