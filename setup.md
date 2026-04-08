# Monolith Engine Setup

## Prerequisites

### Node.js Version
This project requires Node.js version `^18.18.0 || ^19.8.0 || >= 20.0.0`.

### Installing Node.js with nvm (Recommended)

1. Install nvm (Node Version Manager):
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
   ```

2. Load nvm in your current session:
   ```bash
   export NVM_DIR="$HOME/.nvm"
   [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
   ```

3. Install Node.js 20:
   ```bash
   nvm install 20
   ```

4. Set Node.js 20 as default:
   ```bash
   nvm alias default 20
   nvm use 20
   ```

5. Verify installation:
   ```bash
   node --version  # Should show v20.x.x
   npm --version
   ```

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Install additional tools:
   ```bash
   npm install -g bun
   npm install -g @kilocode/cli
   ```

## Quick Setup (One-liner)

For a complete automated setup, run this one-liner:
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash && export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && nvm install 20 && nvm use 20 && npm install && npm install -g bun @kilocode/cli
```

## Development

- Start development server: `npm run dev`
- Build for production: `npm run build`
- Type checking: `npm run typecheck`
- Linting: `npm run lint`