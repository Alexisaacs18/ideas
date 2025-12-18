#!/bin/bash

# Script to clear all data from the database
# This will delete ALL users, documents, embeddings, and messages

echo "⚠️  WARNING: This will delete ALL data from the database!"
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
    echo "Deleting from LOCAL database..."
    wrangler d1 execute second_brain_db --file=./clear_all_data.sql
elif [ "$choice" == "2" ]; then
    echo "Deleting from REMOTE database..."
    wrangler d1 execute second_brain_db --file=./clear_all_data.sql --remote
else
    echo "Invalid choice."
    exit 1
fi

echo ""
echo "✅ Data deletion complete!"
echo ""
echo "Note: Files stored in R2 bucket are NOT deleted by this script."
echo "To delete R2 files, you'll need to do that separately through the Cloudflare dashboard or wrangler."

