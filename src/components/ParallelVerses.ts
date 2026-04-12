import { OsisBible } from '../interfaces/osisBible';
import { NoteBible } from '../interfaces/noteBible';
import { Chapter } from '../interfaces/parsedQuote';
import { cssObj2String } from '../utils/cssObj2String';
import { getVerseText } from '../utils/getVerseText';
import { getVerseTextFromNoteBible } from '../utils/getVerseTextFromNoteBible';
import Verse from './Verse';

export default function ParallelVerses(props: Props) {
  const { bookId, chapter, osisBibles, noteBibles, style, versions, usingNoteBible } = props;
  const html = document.createElement('div');
  html.setAttribute(
    'style',
    cssObj2String({
      display: 'grid',
      rowGap: `${style.fontSize ? parseFloat(style.fontSize) / 2 : 8}px`,
      columnGap: `${style.fontSize ? parseFloat(style.fontSize) : 16}px`,
      gridTemplateColumns: '1fr '.repeat(versions.length),
    })
  );

  for (const verse of chapter.verses) {
    for (const version of versions) {
      let verseText = '';

      if (usingNoteBible) {
        const noteBible = noteBibles.find((bible) => bible.osisIDWork === version);
        if (noteBible) {
          verseText = getVerseTextFromNoteBible(noteBible, { b: bookId, c: chapter.id, v: verse });
        }
      } else {
        const osisBible = osisBibles.find((bible) => bible.$.osisIDWork === version);
        if (osisBible) {
          verseText = getVerseText(osisBible, { b: bookId, c: chapter.id, v: verse });
        }
      }

      html.innerHTML += Verse({ displayNumber: true, number: verse, text: verseText, style });
    }
  }

  return html.outerHTML;
}

interface Props {
  bookId: string;
  chapter: Chapter;
  versions: Array<string>;
  osisBibles: Array<OsisBible>;
  noteBibles: Array<NoteBible>;
  usingNoteBible: boolean;
  style: any;
}
