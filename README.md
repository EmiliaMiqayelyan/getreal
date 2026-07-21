# GetReal Admin Panel

React admin panel for GetReal Food. UI implemented from Figma designs.

## Stack

- React 19 + TypeScript
- Vite
- React Router
- Tailwind CSS v4
- ESLint + Prettier

## Scripts

```bash
npm run dev          # Start development server (port 3000)
npm run build        # Typecheck + production build
npm run preview      # Preview production build
npm run lint         # ESLint
npm run format       # Prettier write
npm run typecheck    # TypeScript check
```

## Structure

```
src/
  pages/            # Route screens (lazy-loaded)
  components/       # UI, layout, feature views
  constants/        # Routes, nav, mock data
  hooks/            # Custom React hooks
  lib/              # Env and integrations
  services/         # API / data access (ready for wiring)
  types/            # TypeScript types
  utils/            # Helpers
```
