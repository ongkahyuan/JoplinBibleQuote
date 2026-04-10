import { PluginConfig } from '../interfaces/config';

/**
 * Gets the plugin configuration from localStorage
 * @returns pluginConfig object
 */
export function getPluginConfig(): PluginConfig {
  try {
    const config = localStorage.getItem('bibleQuotePlugin');
    if (config) {
      return JSON.parse(config);
    }
  } catch (error) {
    // localStorage not available (e.g., mobile sandbox)
  }
  return {
    language: 'en',
    defaultBibleVersion: '',
    verseFontSize: '',
    verseAlignment: '',
    bookAlignment: '',
    chapterAlignment: '',
    chapterPadding: '',
  };
}