#!/bin/bash
# Install all required dependencies for local development
# This script installs Node.js, npm packages, and sets up the project

set -e  # Exit on error

echo "🚀 Installing dependencies for local development..."
echo ""

# Find Homebrew
if [ -f "/opt/homebrew/bin/brew" ]; then
    BREW_PATH="/opt/homebrew"
elif [ -f "/usr/local/bin/brew" ]; then
    BREW_PATH="/usr/local"
else
    echo "❌ Homebrew not found. Please install Homebrew first."
    echo "   Visit: https://brew.sh"
    exit 1
fi

# Add Homebrew to PATH for this script
export PATH="$BREW_PATH/bin:$BREW_PATH/sbin:$PATH"

# Step 1: Install Node.js
echo "📦 Step 1: Installing Node.js..."
if ! command -v node &> /dev/null; then
    $BREW_PATH/bin/brew install node
    export PATH="$BREW_PATH/opt/node/bin:$PATH"
    echo "✅ Node.js installed"
else
    echo "✅ Node.js already installed: $(node --version)"
fi

# Verify Node.js is in PATH
if ! command -v node &> /dev/null; then
    echo "⚠️  Node.js installed but not in PATH. Adding to PATH..."
    export PATH="$BREW_PATH/opt/node/bin:$PATH"
fi

# Step 2: Install Wrangler CLI globally
echo ""
echo "📦 Step 2: Installing Wrangler CLI..."
if ! command -v wrangler &> /dev/null; then
    npm install -g wrangler
    echo "✅ Wrangler installed"
else
    echo "✅ Wrangler already installed: $(wrangler --version)"
fi

# Step 3: Install project dependencies
echo ""
echo "📦 Step 3: Installing project dependencies..."
if [ ! -d "node_modules" ]; then
    npm install
    echo "✅ Project dependencies installed"
else
    echo "✅ Project dependencies already installed"
    echo "   (Run 'npm install' manually if you need to update)"
fi

# Step 4: Generate encryption key helper
echo ""
echo "🔑 Step 4: Generating encryption key..."
if command -v node &> /dev/null; then
    ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    echo ""
    echo "✅ Encryption key generated!"
    echo ""
    echo "Add this to your .dev.vars file:"
    echo "ENCRYPTION_KEY=$ENCRYPTION_KEY"
    echo ""
else
    echo "⚠️  Could not generate encryption key (Node.js not available)"
    echo "   You can generate one manually using:"
    echo "   openssl rand -hex 32"
fi

# Step 5: Check for .dev.vars
echo ""
echo "📝 Step 5: Checking for .dev.vars file..."
if [ ! -f ".dev.vars" ]; then
    echo "⚠️  .dev.vars file not found"
    echo ""
    echo "Create .dev.vars file with:"
    echo "  cp .dev.vars.example .dev.vars"
    echo "  # Then edit .dev.vars and add your API keys"
    echo ""
else
    echo "✅ .dev.vars file exists"
    if ! grep -q "ENCRYPTION_KEY=" .dev.vars 2>/dev/null; then
        echo "⚠️  ENCRYPTION_KEY not found in .dev.vars"
        echo "   Add it using the key generated above"
    else
        echo "✅ ENCRYPTION_KEY found in .dev.vars"
    fi
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Installation complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo ""
echo "1. Set up your .dev.vars file:"
echo "   cp .dev.vars.example .dev.vars"
echo "   # Edit .dev.vars and add your API keys"
echo ""
echo "2. Run database migration:"
echo "   wrangler d1 execute second_brain_db --local --file=migration_encryption.sql"
echo ""
echo "3. Start development servers:"
echo "   Terminal 1: npm run dev:worker"
echo "   Terminal 2: npm run dev"
echo ""
echo "4. Open browser: http://localhost:5173"
echo ""

