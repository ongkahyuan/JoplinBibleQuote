import { BibleNote } from '../interfaces/BibleNote';
import { Chapter } from '../interfaces/parsedQuote';
import { cssObj2String } from '../utils/cssObj2String';
import Verse from './Verse';

interface Props {
  bookId: string;
  chapter: Chapter;
  versions: Array<string>;
  loadedBibles: Map<string, BibleNote>;
  availableVersions: string[];
  defaultVersion: string;
  style: any;
  getVerseText: (version: string, book: string, chapter: number, verse: number) => string;
}

export default function ParallelVerses(props: Props) {
  const { bookId, chapter, versions, loadedBibles, availableVersions, defaultVersion, style, getVerseText } = props;
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
      let versionToUse = version;
      if (version === 'default') {
        versionToUse = defaultVersion || availableVersions[0];
      }

      if (!versionToUse) {
        continue;
      }

      const verseText = getVerseText(versionToUse, bookId, chapter.id, verse);

      html.innerHTML += Verse({ displayNumber: true, number: verse, text: verseText, style });
    }
  }

  return html.outerHTML;
}
