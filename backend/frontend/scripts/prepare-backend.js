const fs = require('fs').promises;
const path = require('path');

async function copyDirectory(src, dest) {
  try {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        // Skip certain directories
        if (['__pycache__', '.git', 'node_modules'].includes(entry.name)) {
          continue;
        }
        await copyDirectory(srcPath, destPath);
      } else {
        // Skip certain files
        if (entry.name.endsWith('.pyc') || 
            entry.name === '.env' || 
            entry.name === 'horary_api.log') {
          continue;
        }
        await fs.copyFile(srcPath, destPath);
      }
    }
  } catch (error) {
    console.error(`Error copying ${src} to ${dest}:`, error);
  }
}

async function prepareBackend() {
  console.log('Preparing backend for packaging...');
  
  const backendSrc = path.join(__dirname, '..', '..', 'backend');
  const backendDest = path.join(__dirname, '..', 'backend');
  
  try {
    // Check if source backend exists
    try {
      await fs.access(backendSrc);
      console.log(`✓ Source backend found at: ${backendSrc}`);
    } catch (error) {
      console.error(`✗ Source backend not found at: ${backendSrc}`);
      throw new Error(`Backend source directory not found: ${backendSrc}`);
    }
    
    // Remove existing backend directory in frontend
    try {
      await fs.rm(backendDest, { recursive: true, force: true });
      console.log('✓ Cleaned existing backend directory');
    } catch (error) {
      // Directory might not exist, ignore error
      console.log('No existing backend directory to clean');
    }
    
    // Copy backend files
    await copyDirectory(backendSrc, backendDest);
    
    // Copy backend executable if it exists
    const executableName = process.platform === 'win32' ? 'horary_backend.exe' : 'horary_backend';
    const executableSrc = path.join(backendSrc, 'dist', executableName);
    const executableDest = path.join(backendDest, executableName);
    
    try {
      await fs.access(executableSrc);
      await fs.copyFile(executableSrc, executableDest);
      console.log(`✓ Backend executable copied: ${executableName}`);
    } catch (error) {
      console.log(`⚠ Backend executable not found at ${executableSrc}`);
      console.log('  Make sure to run "npm run build-backend-exe" first');
    }
    
    // Verify the copy was successful
    const appPyPath = path.join(backendDest, 'app.py');
    try {
      await fs.access(appPyPath);
      console.log('✓ app.py copied successfully');
    } catch (error) {
      throw new Error(`Failed to copy app.py to ${appPyPath}`);
    }
    
    // List files in the destination
    const files = await fs.readdir(backendDest);
    console.log(`✓ Backend files copied (${files.length} files):`);
    files.slice(0, 10).forEach(file => {
      console.log(`  - ${file}`);
    });
    if (files.length > 10) {
      console.log(`  ... and ${files.length - 10} more files`);
    }
    
    console.log('Backend prepared successfully!');
    console.log(`Copied from: ${backendSrc}`);
    console.log(`Copied to: ${backendDest}`);
    
  } catch (error) {
    console.error('Error preparing backend:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  prepareBackend();
}

module.exports = { prepareBackend };