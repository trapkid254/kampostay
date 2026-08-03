/**
 * Frontend Asset Optimization Script
 * 
 * This script optimizes images and SVGs for better performance
 * Usage: node scripts/optimize-assets.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ICONS_DIR = path.join(__dirname, '../icons');
const ASSETS_DIR = path.join(__dirname, '../assets');

console.log('Starting asset optimization...');

// Optimize SVG icons
function optimizeSVGs() {
  console.log('Optimizing SVG icons...');
  
  if (!fs.existsSync(ICONS_DIR)) {
    console.log('Icons directory not found, skipping SVG optimization');
    return;
  }

  const svgFiles = fs.readdirSync(ICONS_DIR).filter(file => file.endsWith('.svg'));
  
  svgFiles.forEach(file => {
    const filePath = path.join(ICONS_DIR, file);
    console.log(`  Optimizing: ${file}`);
    
    try {
      // Use svgo to optimize SVG if available
      execSync(`svgo "${filePath}" -o "${filePath}"`, { stdio: 'ignore' });
    } catch (error) {
      console.log(`  svgo not available, skipping SVG optimization for ${file}`);
    }
  });
  
  console.log('SVG optimization complete');
}

// Optimize images (requires sharp)
function optimizeImages() {
  console.log('Optimizing images...');
  
  if (!fs.existsSync(ASSETS_DIR)) {
    console.log('Assets directory not found, skipping image optimization');
    return;
  }

  try {
    const sharp = require('sharp');
    const imageFiles = fs.readdirSync(ASSETS_DIR).filter(file => 
      /\.(jpg|jpeg|png|webp)$/i.test(file)
    );
    
    imageFiles.forEach(file => {
      const filePath = path.join(ASSETS_DIR, file);
      console.log(`  Optimizing: ${file}`);
      
      sharp(filePath)
        .webp({ quality: 80 })
        .toFile(filePath.replace(/\.(jpg|jpeg|png)$/i, '.webp'))
        .then(() => console.log(`    Created WebP version`))
        .catch(err => console.log(`    Error: ${err.message}`));
    });
    
    console.log('Image optimization complete');
  } catch (error) {
    console.log('sharp not available, skipping image optimization');
    console.log('Install with: npm install sharp');
  }
}

// Generate critical CSS (placeholder)
function generateCriticalCSS() {
  console.log('Critical CSS generation...');
  console.log('  (Requires additional setup - skipping for now)');
}

// Run all optimizations
try {
  optimizeSVGs();
  optimizeImages();
  generateCriticalCSS();
  console.log('\nAsset optimization complete!');
  console.log('Run: npm run optimize');
} catch (error) {
  console.error('Optimization failed:', error);
  process.exit(1);
}
