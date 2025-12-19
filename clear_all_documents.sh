#!/bin/bash

# Clear all documents from D1 database and R2 bucket
# This script clears documents, embeddings, and messages (but keeps users)

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
echo "✅ D1 database cleared!"
echo ""
echo "To clear R2 bucket, use the admin endpoint:"
echo "  POST https://hidden-grass-22b6.alexisaacs18.workers.dev/api/admin/r2/clear"
echo ""
echo "Or run this curl command:"
echo "  curl -X POST https://hidden-grass-22b6.alexisaacs18.workers.dev/api/admin/r2/clear"

