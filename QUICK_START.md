# Quick Start Guide

## One-Time Setup

1. **Install dependencies:**
   ```bash
   cd /Users/alexisaacs/Development/ideas
   ./install-dependencies.sh
   ```

2. **Create `.dev.vars` file:**
   ```bash
   cp .dev.vars.example .dev.vars
   # Edit .dev.vars and add your API keys (HUGGINGFACE, GROQ_API_KEY, etc.)
   # The install script should have generated an ENCRYPTION_KEY for you
   ```

3. **Run database migration:**
   ```bash
   source ./setup-env.sh  # Set up PATH
   wrangler d1 execute second_brain_db --local --file=migration_encryption.sql
   ```

## Every Time You Start Development

**In each new terminal window**, run:

```bash
cd /Users/alexisaacs/Development/ideas
source ./setup-env.sh
```

This sets up your PATH so Node.js, npm, and Wrangler are available.

## Start Development Servers

### Terminal 1 (Backend):
```bash
cd /Users/alexisaacs/Development/ideas
source ./setup-env.sh
npm run dev:worker
```

### Terminal 2 (Frontend):
```bash
cd /Users/alexisaacs/Development/ideas
source ./setup-env.sh
npm run dev
```

### Open Browser:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8787

## Troubleshooting

### "command not found: node"
- Run `source ./setup-env.sh` in your terminal
- Or use full path: `/opt/homebrew/opt/node/bin/node`

### "command not found: wrangler"
- Install it: `npm install -g wrangler`
- Make sure you ran `source ./setup-env.sh` first

### "ENCRYPTION_KEY secret not configured"
- Check that `.dev.vars` exists and has `ENCRYPTION_KEY=your-key-here`
- Restart the worker: `npm run dev:worker`

## Full Documentation

See `LOCAL_SETUP.md` for detailed instructions.

