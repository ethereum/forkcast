# Forkcast - Ethereum Network Upgrades

An experiment by the Protocol & Application Support team to provide public-facing information about Ethereum network upgrades.

## Live Site

Visit the deployed site at: https://forkcast.org

## Overview

This is a standalone client-side application that provides public access to information about Ethereum network upgrades. It displays EIPs (Ethereum Improvement Proposals) in a user-friendly format, showing their inclusion status, impact on different stakeholders, and alignment with Ethereum's strategic goals.

## Features

- **Network Upgrade Overview**: View upcoming, scheduled, and completed Ethereum network upgrades
- **EIP Details**: Detailed information about each EIP including:
  - Layman-friendly explanations
  - Inclusion stage (Proposed, Considered, Scheduled, Declined)
  - Impact on different stakeholders (developers, users, validators, etc.)
  - Alignment with Ethereum's North Star goals (Scale L1, Scale blobs, Improve UX)
  - Benefits, trade-offs, and timeline information

## Development

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
│   │   ├── HomePage.tsx           # Landing page with upgrade list
│   │   └── PublicNetworkUpgradePage.tsx  # Main upgrade detail page
│   ├── data/
│   │   └── eips.json             # EIP data
│   ├── App.tsx                   # Main app component with routing
│   ├── main.tsx                  # App entry point
│   ├── index.css                 # Global styles
│   └── vite-env.d.ts            # Vite type definitions
├── public/                       # Static assets
├── package.json
├── vite.config.ts               # Vite configuration
├── tsconfig.json                # TypeScript configuration
└── README.md
```

## Technology Stack

- **React 19** - UI framework
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