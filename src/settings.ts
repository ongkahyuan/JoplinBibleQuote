import joplin from 'api';
import { SettingItem, SettingItemType } from 'api/types';
import { availableVersions } from './generated/versions';

export namespace Settings {
  export async function register() {
    const bibleVersionOptions: Record<string, string> = {};
    const defaultVersion = availableVersions.length > 0 ? availableVersions[0].value : '';
    for (const v of availableVersions) {
      bibleVersionOptions[v.value] = v.label;
    }

    const settings: Record<string, SettingItem> = {
      bibleVersion: {
        value: defaultVersion,
        type: SettingItemType.String,
        isEnum: true,
        section: 'bibleQuoteSection',
        public: true,
        label: 'Default Bible version',
        description:
          'The default Bible version to use for citations. ' +
          'Reload required: restart Joplin or disable/re-enable the plugin for changes to take effect.',
        options: bibleVersionOptions,
      },
      language: {
        value: 'en',
        type: SettingItemType.String,
        isEnum: true,
        section: 'bibleQuoteSection',
        public: true,
        label: 'Language',
        description: 'The language to display for book names and to parse citations.',
        options: { en: 'English', es: 'Spanish', fr: 'Français', zh: 'Chinese' },
      },
      verseFontSize: {
        value: 16,
        minimum: 10,
        maximum: 30,
        type: SettingItemType.Int,
        section: 'bibleQuoteSection',
        public: true,
        label: 'Verse font size',
      },
      verseAlignment: {
        value: 'justify',
        type: SettingItemType.String,
        isEnum: true,
        section: 'bibleQuoteSection',
        public: true,
        label: 'Verse alignment',
        options: { center: 'Center', left: 'Left', right: 'Right', justify: 'Justify' },
      },
      bookAlignment: {
        value: 'center',
        type: SettingItemType.String,
        isEnum: true,
        section: 'bibleQuoteSection',
        public: true,
        label: 'Bible book name alignment',
        options: { center: 'Center', left: 'Left', right: 'Right', justify: 'Justify' },
      },
      chapterAlignment: {
        value: 'left',
        type: SettingItemType.String,
        isEnum: true,
        section: 'bibleQuoteSection',
        public: true,
        label: 'Chapter number alignment',
        options: { center: 'Center', left: 'Left', right: 'Right', justify: 'Justify' },
      },
      chapterPadding: {
        value: 10,
        minimum: 0,
        maximum: 100,
        type: SettingItemType.Int,
        section: 'bibleQuoteSection',
        public: true,
        label: 'Chapter side padding',
        description: 'Chapter side padding in pixels.',
      },
    };

    await joplin.settings.registerSection('bibleQuoteSection', { iconName: 'fas fa-book', label: 'Bible Quote' });
    await joplin.settings.registerSettings(settings);
  }
}
