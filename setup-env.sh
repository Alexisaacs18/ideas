#!/bin/bash
# Setup script for local development environment
# This script sets up PATH and environment variables for the current session
# Run this before starting development: source setup-env.sh

# Find Homebrew installation
if [ -f "/opt/homebrew/bin/brew" ]; then
    BREW_PATH="/opt/homebrew"
elif [ -f "/usr/local/bin/brew" ]; then
    BREW_PATH="/usr/local"
else
    echo "❌ Homebrew not found. Please install Homebrew first."
    echo "   Visit: https://brew.sh"
    return 1
fi

# Add Homebrew to PATH
export PATH="$BREW_PATH/bin:$BREW_PATH/sbin:$PATH"

# Add Node.js to PATH (if installed via Homebrew)
if [ -d "$BREW_PATH/opt/node" ]; then
    export PATH="$BREW_PATH/opt/node/bin:$PATH"
fi

# Add npm global packages to PATH
if [ -d "$HOME/.npm-global" ]; then
    export PATH="$HOME/.npm-global/bin:$PATH"
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "⚠️  Node.js not found. Installing..."
    $BREW_PATH/bin/brew install node
    export PATH="$BREW_PATH/opt/node/bin:$PATH"
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found even though Node.js should include it."
    return 1
fi

# Verify installations
echo "✅ Environment setup complete!"
echo ""
echo "Installed versions:"
echo "  Node.js: $(node --version 2>/dev/null || echo 'not found')"
echo "  npm: $(npm --version 2>/dev/null || echo 'not found')"
echo "  Wrangler: $(wrangler --version 2>/dev/null || echo 'not installed - run: npm install -g wrangler')"
echo ""
echo "Current directory: $(pwd)"
echo ""
echo "Next steps:"
echo "  1. Install Wrangler: npm install -g wrangler"
echo "  2. Install project dependencies: npm install"
echo "  3. Create .dev.vars file (see LOCAL_SETUP.md)"
echo "  4. Run database migration: wrangler d1 execute second_brain_db --local --file=migration_encryption.sql"
echo "  5. Start dev servers: npm run dev:worker (Terminal 1) and npm run dev (Terminal 2)"

