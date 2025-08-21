const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function fixAndPackage() {
  console.log('🔧 Fixing working exe and creating APPX...');
  
  // Paths
  const backendExeSrc = path.join(__dirname, '..', '..', 'backend', 'dist', 'horary_backend.exe');
  const workingResourcesDir = path.join(__dirname, '..', 'dist-electron', 'win-unpacked', 'resources');
  const backendExeDest = path.join(workingResourcesDir, 'horary_backend.exe');
  
  try {
    // Step 1: Check if working exe directory exists
    try {
      await fs.access(workingResourcesDir);
      console.log(`✓ Working resources directory found`);
    } catch (error) {
      console.error(`✗ Working directory not found. Please run "npm run electron:pack" first`);
      return;
    }
    
    // Step 2: Check if backend exe exists
    try {
      await fs.access(backendExeSrc);
      console.log(`✓ Backend exe found`);
    } catch (error) {
      console.error(`✗ Backend exe not found. Please run "npm run build-backend-exe" first`);
      return;
    }
    
    // Step 3: Copy backend exe to working directory (your manual fix)
    console.log('📋 Copying backend exe to working directory...');
    await fs.copyFile(backendExeSrc, backendExeDest);
    const stats = await fs.stat(backendExeDest);
    console.log(`✓ Backend exe copied (${Math.round(stats.size / 1024 / 1024)}MB)`);
    
    // Step 4: Create APPX from the now-complete working directory
    console.log('📦 Creating APPX from working directory...');
    
    // Use electron-builder to create APPX targeting the working directory
    const { stdout, stderr } = await execAsync('npx electron-builder --win appx --prepackaged dist-electron/win-unpacked', {
      cwd: path.join(__dirname, '..')
    });
    
    console.log('✓ APPX created successfully!');
    if (stdout) console.log('Build output:', stdout);
    
    // Step 5: Show results
    const appxDir = path.join(__dirname, '..', 'dist-electron');
    const files = await fs.readdir(appxDir);
    const appxFiles = files.filter(f => f.endsWith('.appx'));
    
    console.log('🎉 Packaging complete!');
    console.log(`📁 APPX files created: ${appxFiles.length}`);
    appxFiles.forEach(file => {
      console.log(`   - ${file}`);
    });
    
  } catch (error) {
    console.error('❌ Error during fix and package:', error);
    if (error.stderr) {
      console.error('Build errors:', error.stderr);
    }
  }
}

if (require.main === module) {
  fixAndPackage();
}

module.exports = { fixAndPackage };