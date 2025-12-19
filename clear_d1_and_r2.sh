#!/bin/bash

# Clear D1 Database and R2 Bucket
# This script clears all documents from both D1 and R2
# WARNING: This is IRREVERSIBLE!

echo "⚠️  WARNING: This will delete ALL documents from D1 database and R2 bucket!"
echo "This action is IRREVERSIBLE!"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Cancelled."
  exit 0
fi

echo ""
echo "🗑️  Clearing D1 database (documents, embeddings, messages)..."
wrangler d1 execute second_brain_db --remote --command "DELETE FROM embeddings;"
wrangler d1 execute second_brain_db --remote --command "DELETE FROM documents;"
wrangler d1 execute second_brain_db --remote --command "DELETE FROM messages;"

echo ""
echo "🗑️  Clearing R2 bucket..."
# Note: R2 doesn't have a direct CLI command to delete all objects
# We'll need to use the Worker API or list and delete individually
echo "To clear R2, you can use the admin endpoint: POST /api/admin/r2/clear"
echo "Or manually delete objects via Cloudflare dashboard"
echo ""

echo "✅ D1 database cleared!"
echo "⚠️  R2 bucket may still contain files - use admin endpoint or dashboard to clear"

