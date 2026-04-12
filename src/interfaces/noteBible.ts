export interface NoteBible {
  type: 'bibleQuoteNoteBible';
  version: string;
  osisIDWork: string;
  books: Record<string, string[][]>;
}
