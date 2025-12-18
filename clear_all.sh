#!/bin/bash

# Script to clear users, conversations, and documents
# This will delete:
# - All users
# - All conversations (messages)
# - All documents (and their R2 files)

echo "⚠️  WARNING: This will delete ALL users, conversations, and documents!"
echo "This action is IRREVERSIBLE!"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "Select database:"
echo "1. Local database"
echo "2. Remote database (production)"
read -p "Enter choice (1 or 2): " choice

if [ "$choice" == "1" ]; then
    echo ""
    echo "🗑️  Deleting from LOCAL database..."
    wrangler d1 execute second_brain_db --file=./clear_users_docs_conversations.sql
    echo ""
    echo "✅ Database cleared!"
    echo ""
    echo "Note: R2 files are not automatically deleted for local development."
    echo "To delete R2 files, use the Cloudflare dashboard or run:"
    echo "  wrangler r2 bucket list second-brain-docs"
    echo "  wrangler r2 object delete second-brain-docs <file-path>"
    
elif [ "$choice" == "2" ]; then
    echo ""
    echo "🗑️  Deleting from REMOTE database..."
    wrangler d1 execute second_brain_db --file=./clear_users_docs_conversations.sql --remote
    echo ""
    echo "✅ Database cleared!"
    echo ""
    echo "🗑️  Now deleting R2 files..."
    echo ""
    
    # Try to delete R2 files
    echo "Listing R2 objects..."
    r2_objects=$(wrangler r2 bucket list second-brain-docs --json 2>/dev/null)
    
    if [ -z "$r2_objects" ] || [ "$r2_objects" == "[]" ]; then
        echo "✅ R2 bucket is already empty."
    else
        echo "$r2_objects" | jq -r '.[].key' | while read -r key; do
            echo "Deleting: $key"
            wrangler r2 object delete second-brain-docs "$key" 2>/dev/null || true
        done
        echo "✅ R2 files deleted!"
    fi
    
    echo ""
    echo "✅ All data cleared!"
else
    echo "Invalid choice."
    exit 1
fi

