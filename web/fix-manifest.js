import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.join(__dirname, 'dist', 'manifest.webmanifest');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

// Fix paths
manifest.start_url = '/Expense_Manager/';
manifest.scope = '/Expense_Manager/';

manifest.icons = manifest.icons.map(icon => ({
  ...icon,
  src: icon.src.startsWith('/Expense_Manager/') ? icon.src : '/Expense_Manager' + icon.src,
}));

manifest.screenshots = manifest.screenshots.map(screenshot => ({
  ...screenshot,
  src: screenshot.src.startsWith('/Expense_Manager/') ? screenshot.src : '/Expense_Manager' + screenshot.src,
}));

fs.writeFileSync(manifestPath, JSON.stringify(manifest));
console.log('✓ Fixed manifest paths for /Expense_Manager/');
