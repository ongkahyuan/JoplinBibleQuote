import joplin from 'api';
import { OsisBible } from '../interfaces/osisBible';

export async function getOsisBiblesFromNote(folderName: string): Promise<Array<OsisBible>> {
  console.log(`getOsisBiblesFromNote: searching for folder "${folderName}"`);
  const folder = await findFolderByName(folderName);
  if (!folder) {
    console.error(`getOsisBiblesFromNote: folder "${folderName}" not found`);
    return [];
  }

  console.log(`getOsisBiblesFromNote: found folder ${folder.id}`);
  const notes = await getNotesInFolder(folder.id);
  console.log(`getOsisBiblesFromNote: found ${notes.length} notes`);
  console.log(`getOsisBiblesFromNote: notes = ${JSON.stringify(notes.map(n => ({id: n.id, title: n.title, bodyLength: n.body?.length})))}`);

  const osisBibles: Array<OsisBible> = [];
  for (const note of notes) {
    console.log(`getOsisBiblesFromNote: processing note "${note.title}"`);
    const osisBible = parseNoteToOsisBible(note);
    if (osisBible) {
      console.log(`getOsisBiblesFromNote: successfully parsed note "${note.title}" to OsisBible`);
      osisBibles.push(osisBible);
    }
  }

  console.log(`getOsisBiblesFromNote: parsed ${osisBibles.length} valid bibles`);
  console.log(`getOsisBiblesFromNote: osisIDs = ${osisBibles.map(b => b.$.osisIDWork).join(', ')}`);
  return osisBibles;
}

async function findFolderByName(name: string): Promise<{ id: string } | null> {
  const result = await joplin.data.get(['folders']);
  const folders = result.items;
  return folders?.find((f: any) => f.title === name) || null;
}

async function getNotesInFolder(folderId: string): Promise<any[]> {
  const result = await joplin.data.get(['folders', folderId, 'notes']);
  return result.items || [];
}

function parseNoteToOsisBible(note: any): OsisBible | null {
  if (!note.body) {
    console.warn(`getOsisBiblesFromNote: note "${note.title}" has empty body, skipping`);
    return null;
  }

  try {
    const parsed = JSON.parse(note.body);
    if (!validateOsisBible(parsed)) {
      console.warn(`getOsisBiblesFromNote: note "${note.title}" has invalid OsisBible structure, skipping`);
      return null;
    }
    return parsed;
  } catch (e: any) {
    console.warn(`getOsisBiblesFromNote: note "${note.title}" has invalid JSON, skipping: ${e}`);
    return null;
  }
}

function validateOsisBible(obj: any): obj is OsisBible {
  return (
    obj &&
    typeof obj === 'object' &&
    obj.$ && typeof obj.$.osisIDWork === 'string' &&
    Array.isArray(obj.div)
  );
}
