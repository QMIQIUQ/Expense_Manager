import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotsDir = path.join(__dirname, 'public', 'screenshots');

const filesToDelete = [
  'desktop-1.svg',
  'mobile-1.svg',
  'mobile-2.svg',
  'mobile-1-fixed.svg',
  'mobile-2-fixed.svg',
  'generate-placeholders.js',
  'convert-svg-to-png.js',
  'convert.ps1',
  'README.md'
];

filesToDelete.forEach(file => {
  const filePath = path.join(screenshotsDir, file);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`✓ Deleted ${file}`);
  }
});

// Also delete convert-screenshots.js from web root
const webRoot = path.join(__dirname);
const convertScript = path.join(webRoot, 'convert-screenshots.js');
if (fs.existsSync(convertScript)) {
  fs.unlinkSync(convertScript);
  console.log('✓ Deleted convert-screenshots.js');
}

console.log('\nRemaining files:');
const remaining = fs.readdirSync(screenshotsDir);
remaining.forEach(f => console.log(`  - ${f}`));
