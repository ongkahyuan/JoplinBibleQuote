export interface BibleNote {
  version: string;
  language: string;
  copyright?: string;
  books: BookData[];
}

export interface BookData {
  id: string;
  name: string;
  chapters: ChapterData[];
}

export interface ChapterData {
  number: number;
  verses: VerseData[];
}

export interface VerseData {
  number: number;
  text: string;
}
