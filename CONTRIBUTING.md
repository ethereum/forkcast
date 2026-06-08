# Contributing to Forkcast

If you see incorrect information about an EIP's impacts or benefits, content-only pull requests are very welcome. Structural changes or feature requests should open an issue first.

## Development Setup

**With Docker:**

```bash
just docker-dev
```

**Without Docker:**

```bash
just install
just dev
```

Open http://localhost:5173 in your browser.

Run `just help` for all available commands.

## Agent Skills

Project skills live in `.agents/skills/<skill-name>/SKILL.md`. This is the canonical cross-agent location. `.claude/skills` is a relative symlink to that directory so Claude Code loads the same skills without duplicating files.

## Deployment

The site automatically deploys to GitHub Pages when changes are merged into the `main` branch.

## Project Structure

```
forkcast/
├── astro.config.mjs             # Astro config, integrations, and redirects
├── src/
│   ├── pages/                   # Astro routes
│   ├── layouts/                 # Shared Astro layouts
│   ├── components/
│   │   └── HomePage.tsx         # Landing page with upgrade list
│   ├── data/
│   │   └── eips.json            # EIP data
│   └── index.css                # Global styles
├── public/                      # Static assets
├── package.json
└── tsconfig.json                # TypeScript configuration
```

## Technology Stack

- **Astro** - Static site framework
- **React** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **ESLint** - Code linting
- **Vitest** - Unit tests

## Data Structure

The application uses a JSON file (`src/data/eips.json`) containing EIP information. Each EIP includes:

- Basic metadata (ID, title, status, author, etc.)
- Fork relationships (which network upgrades include this EIP)
- Public-facing explanations and impact assessments
