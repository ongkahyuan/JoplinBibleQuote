import { NoteBible } from '../interfaces/noteBible';
import { BCV } from '../interfaces/osisObject';

export function getVerseTextFromNoteBible(noteBible: NoteBible, bcv: BCV): string {
  const bookVerses = noteBible.books[bcv.b];
  if (!bookVerses) return '';

  const chapterVerses = bookVerses[bcv.c - 1];
  if (!chapterVerses) return '';

  const verseText = chapterVerses[bcv.v - 1];
  if (!verseText) return '';

  return verseText;
}
