import joplin from 'api';
import { Settings } from './settings';
import { ContentScriptType } from 'api/types';

export namespace bibleQuote {
  export async function init() {
    console.log('Bible Quote plugin started!');

    await Settings.register();

    await joplin.contentScripts.register(ContentScriptType.MarkdownItPlugin, 'bible-quote', './markdownItPlugin.js');
  }
}
