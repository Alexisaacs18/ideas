# Local Development Setup Guide

## Prerequisites

Before starting, make sure you have:
- ✅ Homebrew installed (https://brew.sh)
- ✅ Terminal access

## Quick Start

### Step 1: Install All Dependencies

Run the installation script (this will install Node.js, Wrangler, and project dependencies):

```bash
cd /Users/alexisaacs/Development/ideas
./install-dependencies.sh
```

This script will:
- Install Node.js via Homebrew
- Install Wrangler CLI globally
- Install project npm dependencies
- Generate an encryption key for you
- Check your setup

### Step 2: Set Up Environment (Each Terminal Session)

**Important**: Since you can't rely on `.zshrc`, you need to source the environment setup script in each new terminal:

```bash
cd /Users/alexisaacs/Development/ideas
source ./setup-env.sh
```

Or you can run it inline:
```bash
source /Users/alexisaacs/Development/ideas/setup-env.sh
```

This adds Homebrew and Node.js to your PATH for the current terminal session.

### Step 3: Generate Encryption Key (if not done by install script)

The encryption key is a **random string** that you generate yourself. Here are several ways to generate it:

#### Option A: Using Node.js (Recommended)
```bash
cd /Users/alexisaacs/Development/ideas
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

This will output a 64-character hex string like:
```
a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

#### Option B: Using OpenSSL
```bash
openssl rand -hex 32
```

#### Option C: Using Online Generator
Visit: https://www.random.org/strings/
- Length: 64 characters
- Character set: Letters and Numbers
- Copy the generated string

**Important**: Save this key securely! You'll need it for both local development and production.

### Step 4: Create `.dev.vars` File

The install script should have generated an encryption key for you. Now create your `.dev.vars` file:

```bash
cd /Users/alexisaacs/Development/ideas
cp .dev.vars.example .dev.vars
```

Then edit `.dev.vars` and add your secrets:

```bash
# Encryption Key (generate using one of the methods above)
ENCRYPTION_KEY=your-64-character-hex-string-here

# HuggingFace API Key (get from https://huggingface.co/settings/tokens)
HUGGINGFACE=your-huggingface-api-key-here

# Groq API Key (get from https://console.groq.com/keys)
GROQ_API_KEY=your-groq-api-key-here

# Google OAuth (if using OAuth)
GOOGLE_OAUTH_CLIENT_ID=your-google-client-id
GOOGLE_OAUTH_CLIENT_SECRET=your-google-client-secret
```

**Example `.dev.vars` file:**
```bash
ENCRYPTION_KEY=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
HUGGINGFACE=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_OAUTH_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxx
```

### Step 5: Run Database Migration (Local)

For local development, you need to apply the encryption migration to your local D1 database:

```bash
cd /Users/alexisaacs/Development/ideas

# Apply migration to local database
wrangler d1 execute second_brain_db --local --file=migration_encryption.sql
```

### Step 6: Start Development Servers

**Important**: In each new terminal, run `source ./setup-env.sh` first to set up your PATH.

#### Terminal 1: Start Worker (Backend)
```bash
cd /Users/alexisaacs/Development/ideas
source ./setup-env.sh  # Set up PATH for this terminal
npm run dev:worker
```

This will:
- Start the Cloudflare Worker on `http://localhost:8787`
- Use your local D1 database
- Use your local R2 bucket (or remote if configured)
- Load secrets from `.dev.vars`

#### Terminal 2: Start Frontend
```bash
cd /Users/alexisaacs/Development/ideas
source ./setup-env.sh  # Set up PATH for this terminal
npm run dev
```

This will:
- Start Vite dev server on `http://localhost:5173`
- Proxy API requests to the worker
- Hot reload on file changes

### Step 7: Test the Setup

1. Open browser: `http://localhost:5173`
2. Upload a test document
3. Check the worker logs in Terminal 1 for:
   - `✅ Encrypted text stored in R2`
   - `✅ Decrypted document` (when searching)

## Troubleshooting

### "ENCRYPTION_KEY secret not configured"
- Make sure `.dev.vars` exists in the `ideas` directory
- Check the file has `ENCRYPTION_KEY=your-key-here`
- Restart `npm run dev:worker`

### "Error decrypting document"
- Verify the encryption key is the same as when you uploaded
- Check that `.dev.vars` has the correct key
- Make sure you're using the same user_id

### Database migration errors
- Make sure you're using `--local` flag for local development
- Check that the database exists: `wrangler d1 list`
- Try creating the database first: `wrangler d1 create second_brain_db`

### Worker not starting
- Check that all required secrets are in `.dev.vars`
- Verify `wrangler.toml` is configured correctly
- Check port 8787 is not already in use

## File Structure

```
ideas/
├── .dev.vars          # Local secrets (NOT committed to git)
├── wrangler.toml      # Wrangler configuration
├── migration_encryption.sql
├── worker/
│   └── index.js        # Backend worker
└── src/               # Frontend React app
```

## Important Notes

1. **`.dev.vars` is gitignored** - Never commit this file!
2. **Use different keys for local vs production** - It's safer to use a different encryption key locally
3. **Local D1 database** - Your local database is separate from production
4. **R2 buckets** - Local development may use remote R2 buckets (check `wrangler.toml`)

## Next Steps

Once local development is working:
1. Test uploading documents
2. Test searching/chatting
3. Verify encryption is working (check R2 for `encrypted.txt` files)
4. When ready for production, set secrets in Cloudflare Dashboard

