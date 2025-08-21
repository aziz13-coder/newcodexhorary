const fs = require('fs').promises;
const path = require('path');

async function packageWorkingExe() {
  console.log('Packaging working exe files for APPX...');
  
  // Paths
  const workingDir = path.join(__dirname, '..', 'dist-electron', 'win-unpacked');
  const backendExeSrc = path.join(__dirname, '..', '..', 'backend', 'dist', 'horary_backend.exe');
  const backendExeDest = path.join(workingDir, 'resources', 'horary_backend.exe');
  
  try {
    // Check if working directory exists
    try {
      await fs.access(workingDir);
      console.log(`✓ Working directory found: ${workingDir}`);
    } catch (error) {
      console.error(`✗ Working directory not found: ${workingDir}`);
      console.log('Please run "npm run electron:pack" first to create the base package');
      throw new Error('Working directory not found');
    }
    
    // Check if backend exe exists
    try {
      await fs.access(backendExeSrc);
      console.log(`✓ Backend exe found: ${backendExeSrc}`);
    } catch (error) {
      console.error(`✗ Backend exe not found: ${backendExeSrc}`);
      console.log('Please run "npm run build-backend-exe" first');
      throw new Error('Backend exe not found');
    }
    
    // Ensure resources directory exists
    const resourcesDir = path.dirname(backendExeDest);
    await fs.mkdir(resourcesDir, { recursive: true });
    console.log(`✓ Resources directory ready: ${resourcesDir}`);
    
    // Copy backend exe to resources
    await fs.copyFile(backendExeSrc, backendExeDest);
    console.log(`✓ Backend exe copied to: ${backendExeDest}`);
    
    // Verify the copy
    const stats = await fs.stat(backendExeDest);
    console.log(`✓ Backend exe verified (${Math.round(stats.size / 1024 / 1024)}MB)`);
    
    // Now run electron-builder to create APPX from the working directory
    console.log('Creating APPX from working exe files...');
    const { spawn } = require('child_process');
    
    return new Promise((resolve, reject) => {
      const builderProcess = spawn('npx', ['electron-builder', '--win', '--dir', workingDir, '--config.directories.output=dist-electron-working'], {
        stdio: 'inherit',
        shell: true,
        cwd: path.join(__dirname, '..')
      });
      
      builderProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✓ APPX package created successfully with working exe files!');
          resolve();
        } else {
          console.error(`✗ APPX packaging failed with code ${code}`);
          reject(new Error(`Packaging failed with code ${code}`));
        }
      });
      
      builderProcess.on('error', (error) => {
        console.error('✗ Error running electron-builder:', error);
        reject(error);
      });
    });
    
  } catch (error) {
    console.error('Error packaging working exe:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  packageWorkingExe();
}

module.exports = { packageWorkingExe };