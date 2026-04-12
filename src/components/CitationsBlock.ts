import { PluginConfig } from '../interfaces/config';
import { OsisBible } from '../interfaces/osisBible';
import { NoteBible } from '../interfaces/noteBible';
import { ParsedQuote } from '../interfaces/parsedQuote';
import { cssObj2String } from '../utils/cssObj2String';
import { getVerseText } from '../utils/getVerseText';
import { getVerseTextFromNoteBible } from '../utils/getVerseTextFromNoteBible';
import { bibleIndexFull } from '../languages';
import Book from './Book';
import Chapter from './Chapter';
import Citation from './Citation';
import Verse from './Verse';
import { ParsedEntity } from '../interfaces/parseResult';
import { parseQuote } from '../utils/parseQuote';
import { BibleLanguage } from '../interfaces/bibleIndex';

export default function CitationsBlock(props: Props) {
  const { bibleIndex, bibleInfo, defaultOsisBible, entity, osisBibles, defaultNoteBible, noteBibles, pluginConfig } = props;
  const html = document.createElement('div');

  html.setAttribute(
    'style',
    cssObj2String({
      padding: '30px',
    })
  );

  const usingNoteBible = !!defaultNoteBible;

  const parsedQuotes: Array<ParsedQuote> = [];
  for (const osisObject of entity.osisObjects) {
    parsedQuotes.push(parseQuote(osisObject, bibleIndex, bibleInfo));
  }

  for (const version of entity.versions) {
    let currentOsisBible: OsisBible | null = null;
    let currentNoteBible: NoteBible | null = null;
    let osisIDWork = 'unknown';

    if (usingNoteBible) {
      if (version === 'default') {
        currentNoteBible = defaultNoteBible;
        osisIDWork = defaultNoteBible?.osisIDWork || 'unknown';
      } else {
        currentNoteBible = noteBibles.find((bible) => bible.osisIDWork === version) || null;
        osisIDWork = currentNoteBible?.osisIDWork || version;
      }
    } else {
      if (version === 'default') {
        currentOsisBible = defaultOsisBible;
        osisIDWork = defaultOsisBible?.$.osisIDWork || 'unknown';
      } else {
        currentOsisBible = osisBibles.find((bible) => bible.$.osisIDWork === version) || null;
        osisIDWork = currentOsisBible?.$.osisIDWork || version;
      }
    }

    if (!currentOsisBible && !currentNoteBible) continue;

    for (const fullQuote of parsedQuotes) {
      const booksHtml = [];
      for (const book of fullQuote.books) {
        const chaptersHTML = [];
        for (const chapter of book.chapters) {
          const versesHTML = [];
          for (let verse of chapter.verses) {
            let verseText = '';
            if (usingNoteBible && currentNoteBible) {
              verseText = getVerseTextFromNoteBible(currentNoteBible, { b: book.id, c: chapter.id, v: verse });
            } else if (currentOsisBible) {
              verseText = getVerseText(currentOsisBible, { b: book.id, c: chapter.id, v: verse });
            }

            versesHTML.push(
              Verse({
                text: verseText,
                number: verse,
                displayNumber: chapter.verses.length > 1 || book.chapters.length > 1 || fullQuote.books.length > 1,
                style: {
                  fontSize: `${pluginConfig.verseFontSize}px`,
                  textAlign: pluginConfig.verseAlignment,
                },
              })
            );
          }

          chaptersHTML.push(
            Chapter({
              verses: versesHTML,
              text: bibleIndexFull[pluginConfig.language].chapter,
              number: chapter.id,
              displayChapter: book.chapters.length > 1 || fullQuote.books.length > 1,
              style: {
                fontSize: `${pluginConfig.verseFontSize * 1.1}px`,
                padding: `${pluginConfig.chapterPadding}px`,
                textAlign: pluginConfig.chapterAlignment,
                textIndent: `${pluginConfig.verseFontSize * 2}px`,
              },
            })
          );
        }

        booksHtml.push(
          Book({
            chapters: chaptersHTML,
            name: book.name,
            displayName: fullQuote.books.length > 1,
            style: {
              fontSize: `${pluginConfig.verseFontSize * 1.6}px`,
              margin: '0px',
              textAlign: pluginConfig.bookAlignment,
            },
          })
        );
      }

      html.innerHTML += Citation({
        books: booksHtml,
        citation: fullQuote.cite,
        osisIDWork,
        displayFullCitation: true,
        displayOsisIDWork: true,
        style: {
          fontSize: `${pluginConfig.verseFontSize}px`,
        },
      });

      if (fullQuote !== parsedQuotes[parsedQuotes.length - 1]) {
        html.innerHTML += `<hr style="border: none; border-top: 1px solid grey; margin: ${pluginConfig.verseFontSize}px">`;
      }
    }

    if (version === entity.versions[entity.versions.length - 1]) continue;
    html.innerHTML += `<hr style="${cssObj2String({
      border: 'none',
      borderTop: '3px double grey',
      marginTop: `${pluginConfig.verseFontSize}px`,
      marginBottom: `${pluginConfig.verseFontSize}px`,
    })}">`;
  }

  return html.outerHTML;
}

interface Props {
  bibleIndex: BibleLanguage;
  bibleInfo: any;
  entity: ParsedEntity;
  defaultOsisBible: OsisBible | null;
  osisBibles: Array<OsisBible>;
  defaultNoteBible: NoteBible | null;
  noteBibles: Array<NoteBible>;
  pluginConfig: PluginConfig;
}
