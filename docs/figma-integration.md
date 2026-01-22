# Figma Integration Guide

Complete guide to setting up Figma with Tokens Studio for bidirectional design token sync.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Figma Account Setup](#figma-account-setup)
3. [Tokens Studio Plugin](#tokens-studio-plugin)
4. [GitHub Sync Configuration](#github-sync-configuration)
5. [Working with Tokens](#working-with-tokens)
6. [Claude + Figma MCP](#claude--figma-mcp)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, you'll need:

- [ ] GitHub account (you already have this)
- [ ] Access to the ADAgentAI repository
- [ ] A Figma account (free tier works)

---

## Figma Account Setup

### Step 1: Create a Figma Account

1. Go to [figma.com](https://www.figma.com)
2. Click **Sign up** (top right)
3. Options:
   - **Sign up with Google** (recommended - faster)
   - Sign up with email
4. Verify your email if prompted

### Step 2: Choose Your Plan

| Plan | Cost | Best For |
|------|------|----------|
| **Starter** | Free | Solo work, learning |
| **Professional** | $15/mo | Team collaboration |
| **Organization** | $45/mo | Enterprise features |

For initial setup, **Starter (free)** is sufficient.

### Step 3: Create Your First File

1. Click **New design file** from the dashboard
2. This opens the Figma editor
3. You can now install plugins

---

## Tokens Studio Plugin

Tokens Studio (formerly Figma Tokens) is the bridge between Figma and your codebase.

### Step 1: Install the Plugin

1. In Figma, press `Cmd/Ctrl + /` to open the quick actions menu
2. Search for **Tokens Studio for Figma**
3. Or go directly: [Tokens Studio Plugin](https://www.figma.com/community/plugin/843461159747178978)
4. Click **Install**

### Step 2: Open the Plugin

1. Right-click anywhere in your Figma file
2. Go to **Plugins** → **Tokens Studio for Figma**
3. Or use the shortcut: `Cmd/Ctrl + /` → type "Tokens Studio"

### Step 3: First Launch

On first launch, you'll see:
- Token list (empty initially)
- Sync settings
- Theme options

---

## GitHub Sync Configuration

This is where the magic happens - connecting your tokens to the repository.

### Step 1: Generate a GitHub Personal Access Token

1. Go to [GitHub Settings → Developer Settings → Personal Access Tokens](https://github.com/settings/tokens?type=beta)
2. Click **Generate new token** → **Fine-grained token**
3. Configure:
   - **Token name**: `Figma Tokens Studio`
   - **Expiration**: 90 days (or your preference)
   - **Repository access**: Select **Only select repositories** → choose `ADAgentAI`
   - **Permissions**:
     - **Contents**: Read and write
     - **Pull requests**: Read and write (optional, for PR workflow)
4. Click **Generate token**
5. **Copy the token immediately** - you won't see it again!

### Step 2: Configure Tokens Studio Sync

1. In Tokens Studio, click the **Settings** icon (gear)
2. Go to **Sync Providers**
3. Click **Add new** → **GitHub**
4. Fill in:
   ```
   Name: ADAgentAI Tokens
   Personal Access Token: [paste your token]
   Repository: your-username/ADAgentAI
   Default Branch: main (or your dev branch)
   File Path: frontend/tokens
   ```
5. Click **Save credentials**

### Step 3: Pull Existing Tokens

1. Click **Pull from GitHub**
2. Tokens Studio will load all tokens from `frontend/tokens/`
3. You should see:
   - Primitives (colors, spacing, typography)
   - Semantic tokens (dark, light themes)

### Step 4: Test the Connection

1. Make a small change to any token (e.g., change a color value)
2. Click **Push to GitHub**
3. Check GitHub - you should see a new commit or branch

---

## Working with Tokens

### Understanding the Token Structure

When you pull tokens, you'll see them organized as:

```
├── primitives
│   ├── color
│   │   ├── gray (50, 100, 200, ... 950)
│   │   ├── purple (50, 100, ... 900)
│   │   └── ...
│   ├── spacing (1, 2, 3, 4, 6, 8, 12, 16)
│   └── radius (sm, md, lg, xl)
│
└── semantic
    ├── dark
    │   ├── background (primary, secondary, tertiary)
    │   ├── foreground (primary, secondary, muted)
    │   └── accent (default, hover)
    └── light
        └── (same structure as dark)
```

### Creating New Tokens

1. Navigate to the appropriate group (e.g., `semantic/dark`)
2. Click the **+** button
3. Enter:
   - **Name**: `myNewToken`
   - **Type**: Choose (color, dimension, etc.)
   - **Value**: Enter value or reference another token with `{token.path}`

### Referencing Tokens

Use curly braces to reference other tokens:

```
background.elevated → {color.gray.900}
accent.default → {color.purple.500}
```

This creates **aliases** - when the source token changes, all references update.

### Theme Switching

1. Click the theme dropdown (top of Tokens Studio)
2. Switch between **dark** and **light**
3. The preview updates to show how tokens look in each theme

### Applying Tokens to Designs

1. Select a Figma element (rectangle, text, etc.)
2. In Tokens Studio, find the token you want
3. Click the token to apply it
4. The element now uses that token value

---

## Claude + Figma MCP

Claude Code can interact with Figma through MCP (Model Context Protocol).

### Setting Up Figma MCP

1. **Get Figma Personal Access Token**:
   - Go to Figma → Settings → Personal Access Tokens
   - Generate a new token with file access
   - Save it securely

2. **Configure Claude Code**:
   Add to your Claude Code MCP config:
   ```json
   {
     "mcpServers": {
       "figma": {
         "command": "npx",
         "args": ["-y", "@anthropic/mcp-server-figma"],
         "env": {
           "FIGMA_PERSONAL_ACCESS_TOKEN": "your-token-here"
         }
       }
     }
   }
   ```

3. **Restart Claude Code** to load the MCP server

### What Claude Can Do with Figma

| Capability | Example Command |
|------------|-----------------|
| **Read file structure** | "What components are in this Figma file?" |
| **Extract styles** | "Extract all color styles from this design" |
| **Get component details** | "Show me the properties of the Button component" |
| **Convert to tokens** | "Convert these Figma styles to DTCG tokens" |

### Example Workflows

**Extract colors from a design:**
```
"Read the Figma file at [URL] and extract all color styles,
then convert them to W3C DTCG format for our tokens system"
```

**Audit design compliance:**
```
"Compare the colors used in this Figma file against our
existing tokens in frontend/tokens/primitives/colors.tokens.json"
```

**Generate component code:**
```
"Based on the Card component in this Figma file, generate
a React component using our existing token system"
```

---

## Troubleshooting

### "Authentication failed"

- Verify your GitHub token has correct permissions
- Check the token hasn't expired
- Ensure repository name is exact (case-sensitive)

### "File path not found"

- Path should be `frontend/tokens` (no leading slash)
- Ensure the directory exists in your repository
- Check branch name is correct

### "Tokens not syncing"

1. Check internet connection
2. Try disconnecting and reconnecting the sync provider
3. Verify you have write access to the repository

### "Merge conflicts"

If someone edited tokens in both Figma and code:

1. Pull latest from GitHub
2. Resolve conflicts in Tokens Studio (it shows a diff view)
3. Push the merged result

### "Token references not resolving"

- Check the reference path is correct: `{color.gray.900}` not `{color.gray900}`
- Ensure the source token exists
- Primitives must be defined before semantic tokens that reference them

---

## Recommended Workflow

### For Designers

1. Open Tokens Studio in Figma
2. Pull latest tokens from GitHub
3. Make design changes using tokens
4. Create a new branch: `design/my-changes`
5. Push changes to GitHub
6. Create a PR for review

### For Developers

1. Work in code as normal
2. Edit `frontend/tokens/*.tokens.json` files
3. Run `bun run tokens:build` to generate CSS
4. Commit and push
5. Designers can pull the changes in Tokens Studio

### Best Practice: Single Source of Truth

- **Primitives**: Mostly edited in code (raw values rarely change)
- **Semantic tokens**: Can be edited in either place
- **Component tokens**: Usually edited in code

---

## Resources

- [Tokens Studio Documentation](https://docs.tokens.studio/)
- [Figma Developer Documentation](https://www.figma.com/developers)
- [W3C Design Tokens Spec](https://tr.designtokens.org/format/)
- [Figma MCP Server](https://github.com/anthropics/mcp-server-figma)
- [GitHub Fine-Grained Tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
