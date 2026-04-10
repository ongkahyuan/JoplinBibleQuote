import joplin from 'api';
import { OsisBible } from '../interfaces/osisBible';
import { getOsisBible } from './getOsisBible';

export interface OsisBibleWithPath {
  path: string;
  osisBible: OsisBible;
}

export function getOsisBibles(biblesPath: string): Array<OsisBible> {
  const biblesWithPaths = getOsisBiblesWithPaths(biblesPath);
  return biblesWithPaths.map(b => b.osisBible);
}

export function getOsisBiblesWithPaths(biblesPath: string): Array<OsisBibleWithPath> {
  const osisBibles: Array<OsisBibleWithPath> = [];

  let fs: any;
  try {
    fs = joplin.require('fs');
  } catch (error) {
    console.error('File system access is only available on desktop.');
    return [];
  }

  let files: any[] = [];
  try {
    files = fs.readdirSync(biblesPath, {
      withFileTypes: true,
    });
  } catch (error) {
    console.error('Failed to read bibles directory:', error);
    return [];
  }

  files = files.filter((file: any) => file.name.match(/.xml$/));

  for (const file of files) {
    const filePath = biblesPath + '/' + file.name;
    const result = getOsisBible(filePath);
    if (result.errorMessage || !result.osisBible) continue;
    osisBibles.push({ path: filePath, osisBible: result.osisBible });
  }

  return osisBibles;
}