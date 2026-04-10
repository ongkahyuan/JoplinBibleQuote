export type BibleRequest =
  | { type: 'GET_VERSE'; version: string; book: string; chapter: number; verse: number }
  | { type: 'GET_BOOK'; version: string; book: string }
  | { type: 'LIST_VERSIONS' }
  | { type: 'GET_BIBLE'; version: string }
  | { type: 'INIT_BIBLES'; versions: string[] }
  | { type: 'GET_SETTINGS' };

export type BibleResponse =
  | { type: 'VERSE'; text: string }
  | { type: 'BOOK'; data: import('./BibleNote').BookData }
  | { type: 'VERSIONS'; versions: string[] }
  | { type: 'BIBLE'; data: import('./BibleNote').BibleNote }
  | { type: 'INIT_COMPLETE'; loaded: string[]; available: string[] }
  | { type: 'SETTINGS'; settings: import('./config').MobilePluginConfig };
