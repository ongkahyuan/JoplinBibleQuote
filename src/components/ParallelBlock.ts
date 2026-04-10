import { BibleLanguage } from '../interfaces/bibleIndex';
import { PluginConfig } from '../interfaces/config';
import { BibleNote } from '../interfaces/BibleNote';
import { ParsedEntity } from '../interfaces/parseResult';
import { cssObj2String } from '../utils/cssObj2String';
import { parseQuote } from '../utils/parseQuote';
import { bibleIndexFull } from '../languages';
import ChapterTitle from './ChapterTitle';
import ParallelVerses from './ParallelVerses';
import BookName from './BookTitle';
import FullCitation from './FullCitation';

interface Props {
  bibleIndex: BibleLanguage;
  bibleInfo: any;
  parsedEntity: ParsedEntity;
  loadedBibles: Map<string, BibleNote>;
  availableVersions: string[];
  pluginConfig: PluginConfig;
  getVerseText: (version: string, book: string, chapter: number, verse: number) => string;
}

export default function ParallelBlock(props: Props) {
  const { bibleIndex, bibleInfo, parsedEntity, loadedBibles, availableVersions, pluginConfig, getVerseText } = props;
  const html = document.createElement('div');

  html.setAttribute(
    'style',
    cssObj2String({
      padding: '30px',
    })
  );

  for (const osisObject of parsedEntity.osisObjects) {
    const parsedQuote = parseQuote(osisObject, bibleIndex, bibleInfo);

    const citationsDiv = document.createElement('div');
    citationsDiv.setAttribute(
      'style',
      cssObj2String({
        display: 'grid',
        columnGap: `${pluginConfig.verseFontSize}px`,
        gridTemplateColumns: '1fr '.repeat(parsedEntity.versions.length),
      })
    );
    for (const version of parsedEntity.versions) {
      let displayVersion = version;
      if (version === 'default') {
        displayVersion = pluginConfig.defaultBibleVersion || availableVersions[0] || '';
      }
      citationsDiv.innerHTML += FullCitation({
        citation: parsedQuote.cite,
        displayOsisIDWork: true,
        osisIDWork: displayVersion,
        style: {
          fontSize: `${pluginConfig.verseFontSize}px`,
        },
      });
    }
    html.appendChild(citationsDiv);

    for (const book of parsedQuote.books) {
      if (parsedQuote.books.length > 1) {
        html.innerHTML += BookName({
          name: book.name,
          style: {
            fontSize: `${Number(pluginConfig.verseFontSize) * 1.6}px`,
            margin: '0px',
            textAlign: pluginConfig.bookAlignment,
          },
        });
      }

      for (const chapter of book.chapters) {
        if (parsedQuote.books.length > 1 || book.chapters.length > 1) {
          html.innerHTML += ChapterTitle({
            number: chapter.id,
            style: {
              fontSize: `${Number(pluginConfig.verseFontSize) * 1.1}px`,
              padding: `${pluginConfig.chapterPadding}px`,
              textAlign: pluginConfig.chapterAlignment,
            },
            text: bibleIndexFull[pluginConfig.language].chapter,
          });
        }

        html.innerHTML += ParallelVerses({
          bookId: book.id,
          chapter,
          versions: parsedEntity.versions,
          loadedBibles,
          availableVersions,
          defaultVersion: pluginConfig.defaultBibleVersion || '',
          style: {
            fontSize: `${pluginConfig.verseFontSize}px`,
            textAlign: pluginConfig.verseAlignment,
          },
          getVerseText,
        });
      }
    }

    if (osisObject !== parsedEntity.osisObjects[parsedEntity.osisObjects.length - 1]) {
      html.innerHTML += `<hr style="border: none; border-top: 1px solid grey; margin: ${pluginConfig.verseFontSize}px">`;
    }
  }

  return html.outerHTML;
}
