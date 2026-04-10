import { BibleLanguage } from '../interfaces/bibleIndex';
import { PluginConfig } from '../interfaces/config';
import { BibleNote } from '../interfaces/BibleNote';
import { ParsedEntity } from '../interfaces/parseResult';
import { cssObj2String } from '../utils/cssObj2String';
import CitationsBlock from './CitationsBlock';
import ParallelBlock from './ParallelBlock';

interface Props {
  bibleIndex: BibleLanguage;
  bibleInfo: any;
  loadedBibles: Map<string, BibleNote>;
  availableVersions: string[];
  parsedEntities: Array<ParsedEntity>;
  pluginConfig: PluginConfig;
  getVerseText: (version: string, book: string, chapter: number, verse: number) => string;
}

export default function Main(props: Props) {
  const { bibleIndex, bibleInfo, parsedEntities, loadedBibles, availableVersions, pluginConfig, getVerseText } = props;
  const html = document.createElement('div');
  html.setAttribute('style', `border:1px solid #545454;`);

  for (const entity of parsedEntities) {
    if (entity.options?.parallel) {
      html.innerHTML += ParallelBlock({
        bibleIndex,
        bibleInfo,
        loadedBibles,
        availableVersions,
        parsedEntity: entity,
        pluginConfig,
        getVerseText,
      });
    }

    if (!entity.options?.parallel) {
      html.innerHTML += CitationsBlock({
        bibleIndex,
        bibleInfo,
        loadedBibles,
        availableVersions,
        entity,
        pluginConfig,
        getVerseText,
      });
    }

    if (entity === parsedEntities[parsedEntities.length - 1]) continue;
    html.innerHTML += `<hr style="${cssObj2String({
      border: 'none',
      borderTop: '3px double grey',
      marginBottom: '0px',
      marginLeft: '15px',
      marginRight: '15px',
      marginTop: '0px',
    })}">`.repeat(2);
  }

  return html.outerHTML;
}
