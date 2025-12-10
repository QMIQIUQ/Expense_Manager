const { execSync } = require('child_process');
const path = require('path');

const webDir = path.join(__dirname, 'web');
console.log('Building from:', webDir);

try {
  execSync('npm run build', { cwd: webDir, stdio: 'inherit' });
  console.log('\n✓ Build completed successfully!');
} catch (error) {
  console.error('✗ Build failed:', error.message);
  process.exit(1);
}
