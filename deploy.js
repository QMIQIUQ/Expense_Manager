const { execSync } = require('child_process');
const path = require('path');

const projDir = 'c:\\個人文件\\Project\\Expense_Manager';

try {
  console.log('Staging changes...');
  execSync('git add -A', { cwd: projDir, stdio: 'inherit' });
  
  console.log('\nCommitting...');
  execSync('git commit -m "fix: Manifest 404 issue - Set base URL to /Expense_Manager/ and fix manifest.webmanifest path"', { 
    cwd: projDir, 
    stdio: 'inherit' 
  });
  
  console.log('\nPushing to GitHub...');
  execSync('git push origin main', { cwd: projDir, stdio: 'inherit' });
  
  console.log('\n✓ Done! Changes deployed to GitHub Pages');
} catch (error) {
  console.log('Process finished');
}
