# Contributing to Forkcast

If you see incorrect information about an EIP's impacts or benefits, content-only pull requests are very welcome. Structural changes or feature requests should open an issue first.

## Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

The site automatically deploys to GitHub Pages when changes are merged into the `main` branch.

## Project Structure

```
forkcast-public/
├── src/
│   ├── components/
│   │   └── HomePage.tsx         # Landing page with upgrade list
│   ├── data/
│   │   └── eips.json            # EIP data
│   ├── App.tsx                  # Main app component with routing
│   ├── main.tsx                 # App entry point
│   ├── index.css                # Global styles
│   └── vite-env.d.ts            # Vite type definitions
├── public/                      # Static assets
├── package.json
├── vite.config.ts               # Vite configuration
└── tsconfig.json                # TypeScript configuration
```

## Technology Stack

- **React** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Tailwind CSS** - Styling
- **ESLint** - Code linting

## Data Structure

The application uses a JSON file (`src/data/eips.json`) containing EIP information. Each EIP includes:

- Basic metadata (ID, title, status, author, etc.)
- Fork relationships (which network upgrades include this EIP)
- Public-facing explanations and impact assessments