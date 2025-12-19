#!/bin/bash
# Generate encryption key for .dev.vars file

# Find Homebrew and add to PATH
if [ -f "/opt/homebrew/bin/brew" ]; then
    BREW_PATH="/opt/homebrew"
elif [ -f "/usr/local/bin/brew" ]; then
    BREW_PATH="/usr/local"
else
    echo "❌ Homebrew not found. Please install Homebrew first."
    exit 1
fi

export PATH="$BREW_PATH/bin:$BREW_PATH/sbin:$PATH"

# Add Node.js to PATH if installed
if [ -d "$BREW_PATH/opt/node" ]; then
    export PATH="$BREW_PATH/opt/node/bin:$PATH"
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found."
    echo ""
    echo "Please install Node.js first:"
    echo "  $BREW_PATH/bin/brew install node"
    echo ""
    echo "Or use OpenSSL instead:"
    echo "  openssl rand -hex 32"
    exit 1
fi

# Generate encryption key
echo "🔑 Generating encryption key..."
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

echo ""
echo "✅ Encryption key generated!"
echo ""
echo "Add this to your .dev.vars file:"
echo "ENCRYPTION_KEY=$ENCRYPTION_KEY"
echo ""
echo "Or copy this line:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "ENCRYPTION_KEY=$ENCRYPTION_KEY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

