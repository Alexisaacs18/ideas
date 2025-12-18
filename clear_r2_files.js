/**
 * Script to delete all files from R2 bucket
 * Run with: node clear_r2_files.js
 * 
 * Note: This requires wrangler to be configured and authenticated
 */

import { execSync } from 'child_process';

const BUCKET_NAME = 'second-brain-docs';

console.log('🗑️  Deleting all files from R2 bucket:', BUCKET_NAME);
console.log('⚠️  This will delete ALL files in the bucket!');
console.log('');

try {
  // List all objects in the bucket
  console.log('📋 Listing all objects...');
  const listOutput = execSync(`wrangler r2 bucket list ${BUCKET_NAME} --json`, { encoding: 'utf-8' });
  
  const objects = JSON.parse(listOutput);
  
  if (!objects || objects.length === 0) {
    console.log('✅ Bucket is already empty.');
    process.exit(0);
  }
  
  console.log(`Found ${objects.length} objects to delete.`);
  console.log('');
  
  // Delete each object
  let deleted = 0;
  let errors = 0;
  
  for (const obj of objects) {
    try {
      execSync(`wrangler r2 object delete ${BUCKET_NAME} "${obj.key}"`, { stdio: 'ignore' });
      deleted++;
      if (deleted % 10 === 0) {
        process.stdout.write(`\rDeleted ${deleted}/${objects.length} files...`);
      }
    } catch (error) {
      console.error(`\n❌ Error deleting ${obj.key}:`, error.message);
      errors++;
    }
  }
  
  console.log('\n');
  console.log(`✅ Deleted ${deleted} files.`);
  if (errors > 0) {
    console.log(`⚠️  ${errors} errors occurred.`);
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.log('\n💡 Tip: Make sure you are authenticated with wrangler: wrangler login');
  process.exit(1);
}

