const fs = require('fs').promises;
const path = require('path');

async function cleanBuild() {
  console.log('Cleaning build directories...');
  
  const pathsToClean = [
    path.join(__dirname, '..', 'dist'),
    path.join(__dirname, '..', 'dist-electron'),
    path.join(__dirname, '..', 'backend', 'horary_api.log'),
    path.join(__dirname, '..', '..', 'backend', 'horary_api.log'),
    path.join(__dirname, '..', '..', 'backend', 'dist'),
    path.join(__dirname, '..', '..', 'backend', 'build'),
  ];
  
  for (const cleanPath of pathsToClean) {
    try {
      const stats = await fs.stat(cleanPath);
      if (stats.isDirectory()) {
        await fs.rm(cleanPath, { recursive: true, force: true });
        console.log(`✓ Removed directory: ${cleanPath}`);
      } else {
        await fs.unlink(cleanPath);
        console.log(`✓ Removed file: ${cleanPath}`);
      }
    } catch (error) {
      // File/directory doesn't exist, that's fine
      console.log(`  Skipped (not found): ${cleanPath}`);
    }
  }
  
  console.log('Clean complete!');
}

if (require.main === module) {
  cleanBuild().catch(console.error);
}

module.exports = { cleanBuild };