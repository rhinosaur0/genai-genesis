// Fix Dependencies Script
// Run with: node fix-deps.js

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Checking for dependency issues...');

// Define critical packages to check
const criticalPackages = [
  '@react-three/fiber',
  '@react-three/drei',
  'three',
  'react',
  'react-dom',
  'react-router-dom',
  'styled-components',
  'firebase'
];

// Check if node_modules directory exists
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('❌ node_modules directory not found. Running npm install...');
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed successfully!');
  } catch (error) {
    console.error('❌ Error installing dependencies:', error.message);
    process.exit(1);
  }
}

// Check for critical packages
const missingPackages = [];
criticalPackages.forEach(pkg => {
  const pkgPath = path.join(nodeModulesPath, pkg);
  if (!fs.existsSync(pkgPath)) {
    missingPackages.push(pkg);
  }
});

if (missingPackages.length > 0) {
  console.log(`❌ Missing packages: ${missingPackages.join(', ')}`);
  console.log('📦 Reinstalling missing packages...');
  
  try {
    execSync(`npm install ${missingPackages.join(' ')}`, { stdio: 'inherit' });
    console.log('✅ Missing packages installed successfully!');
  } catch (error) {
    console.error('❌ Error installing packages:', error.message);
    console.log('⚠️ Trying to rebuild all dependencies...');
    
    try {
      execSync('npm ci', { stdio: 'inherit' });
      console.log('✅ Dependencies rebuilt successfully!');
    } catch (error) {
      console.error('❌ Error rebuilding dependencies:', error.message);
      console.log('🔄 Falling back to deleting node_modules and reinstalling...');
      
      try {
        execSync('rm -rf node_modules package-lock.json', { stdio: 'inherit' });
        execSync('npm install', { stdio: 'inherit' });
        console.log('✅ Dependencies reinstalled successfully!');
      } catch (error) {
        console.error('❌ Final attempt failed:', error.message);
        process.exit(1);
      }
    }
  }
} else {
  console.log('✅ All critical packages are installed!');
}

console.log('🚀 Running development server...');
try {
  execSync('npm run dev', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Error starting development server:', error.message);
} 