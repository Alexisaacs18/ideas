/**
 * Script to convert logo.svg to logo.png (512x512)
 * 
 * Run with: node generate-logo-png.js
 * 
 * Requires: sharp package
 * Install: npm install sharp --save-dev
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const svgPath = path.join(__dirname, 'logo.svg');
const pngPath = path.join(__dirname, 'public', 'logo.png');

async function convertSvgToPng() {
  try {
    const svgBuffer = fs.readFileSync(svgPath);
    
    await sharp(svgBuffer)
      .resize(512, 512)
      .png()
      .toFile(pngPath);
    
    console.log('✅ Successfully created logo.png (512x512)');
    console.log(`   Saved to: ${pngPath}`);
  } catch (error) {
    console.error('❌ Error converting SVG to PNG:', error.message);
    console.log('\n💡 Alternative: Use an online converter like:');
    console.log('   - https://cloudconvert.com/svg-to-png');
    console.log('   - https://convertio.co/svg-png/');
    console.log('   Or install ImageMagick and run:');
    console.log('   convert logo.svg -resize 512x512 public/logo.png');
  }
}

convertSvgToPng();

