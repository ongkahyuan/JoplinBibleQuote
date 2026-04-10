export interface PluginConfig {
  biblePath?: string;
  biblesPath?: string;
  bookAlignment: string;
  chapterAlignment: string;
  chapterPadding: number | string;
  language: string;
  verseAlignment: string;
  verseFontSize: number | string;
  defaultBibleVersion?: string;
  availableVersions?: string[];
}

export interface MobilePluginConfig {
  defaultBibleVersion: string;
  availableVersions: string[];
  verseFontSize: number | string;
  verseAlignment: string;
  bookAlignment: string;
  chapterAlignment: string;
  chapterPadding: number | string;
  language: string;
}
