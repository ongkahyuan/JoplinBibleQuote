const fs = require('fs');
const path = require('path');
const { parseStringPromise } = require('xml2js');

const OSIS_DIR = path.resolve(__dirname, '..', 'bibles', 'OSIS');
const GENERATED_DIR = path.resolve(__dirname, '..', 'src', 'generated');

async function main() {
  const files = fs.readdirSync(OSIS_DIR).filter((f) => f.endsWith('.xml'));

  const versions = [];
  const bibles = {};

  for (const file of files) {
    const filePath = path.join(OSIS_DIR, file);
    const label = path.basename(file, '.xml');
    console.log(`Parsing: ${label}...`);

    const xml = fs.readFileSync(filePath, 'utf8');
    let parsed;
    try {
      parsed = await parseStringPromise(xml);
    } catch (err) {
      console.warn(`Warning: failed to parse ${file}: ${err.message}`);
      continue;
    }

    const osisText = parsed?.osis?.osisText?.[0];
    if (!osisText) {
      console.warn(`Warning: ${file} is not a valid OSIS Bible, skipping`);
      continue;
    }

    const osisIDWork = osisText.$.osisIDWork;
    if (!osisIDWork) {
      console.warn(`Warning: ${file} has no osisIDWork, skipping`);
      continue;
    }

    versions.push({
      value: osisIDWork,
      label: label,
    });

    bibles[osisIDWork] = osisText;
    console.log(`  -> ${osisIDWork} (${label})`);
  }

  if (versions.length === 0) {
    console.error('Error: no valid OSIS Bibles found in', OSIS_DIR);
    process.exit(1);
  }

  fs.mkdirSync(GENERATED_DIR, { recursive: true });

  const versionsContent =
    'export const availableVersions: Array<{ value: string; label: string }> = ' +
    JSON.stringify(versions) +
    ';\n';

  fs.writeFileSync(path.join(GENERATED_DIR, 'versions.ts'), versionsContent);

  fs.writeFileSync(path.join(GENERATED_DIR, 'bibles.json'), JSON.stringify(bibles));

  console.log(`\nGenerated ${versions.length} bibles in src/generated/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
