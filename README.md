# GetReal Admin Panel

Next.js admin panel foundation. UI will be implemented from Figma designs.

## Stack

- Next.js (App Router)
- React + TypeScript
- Tailwind CSS
- ESLint + Prettier

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
npm run format       # Prettier write
npm run typecheck    # TypeScript check
```

## Structure

```
src/
  app/              # App Router (layouts, routes)
  components/       # UI, layout, shared components
  constants/        # App constants
  hooks/            # Custom React hooks
  lib/              # Fonts, env, integrations
  services/         # API / data access
  styles/           # Shared styles
  types/            # TypeScript types
  utils/            # Helpers
```
