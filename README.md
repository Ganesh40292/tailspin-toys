# Tailspin Toys

Tailspin Toys is a fictional crowdfunding platform for developer-themed games. The project is a single-page Astro application with static generation, a local SQLite database, and a dark, responsive storefront experience for browsing, filtering, and supporting indie game projects.

This README documents the project's purpose, architecture, setup, data model, development flow, and verification process.

## Project overview

Tailspin Toys showcases a curated catalog of games aimed at developers, coding enthusiasts, and tech-themed players. The application is intentionally designed as a fully pre-rendered static site:

- Astro builds the site at compile time
- Data is queried directly from SQLite in frontmatter
- No server-side API is required at runtime
- The resulting HTML is fast, portable, and ideal for static hosting

The app includes:

- a home page with a game catalog
- filtering by title, category, and publisher
- a game details view for each title
- a branded 404 page for missing entries
- accessible navigation and semantic HTML structure
- deterministic rating generation from title data

## Why this project exists

The project is a practical example of a database-backed static site built with Astro, Drizzle ORM, and Node.js SQLite. It demonstrates:

- static generation with build-time data hydration
- SQLite-backed content management in a local project
- schema versioning and migrations
- CSV-based seeding from structured data
- frontend filtering without a client-side framework
- accessibility-conscious UI design

## Tech stack

- Astro 7
- Tailwind CSS v4
- Node.js 22.13+
- SQLite via Node's built-in `node:sqlite`
- Drizzle ORM
- Vitest for unit tests
- Playwright for browser-based end-to-end tests
- TypeScript 6 for app code + TypeScript 7 native checker for validation

## Architecture

### Frontend

The frontend is composed of Astro pages and components:

- `src/pages/index.astro` — home page with game catalog and filter controls
- `src/pages/about.astro` — informational company page
- `src/pages/game/[id].astro` — dynamic game detail route
- `src/pages/404.astro` — custom missing page
- `src/layouts/` — reusable page layout wrappers
- `src/components/` — repeated UI pieces such as cards and page structure

The site is built as static output and is fully prerendered, so the browser receives plain HTML and CSS without a client framework.

### Data layer

The data layer lives in the `db/` folder and `src/lib/`:

- `db/schema.ts` — schema definitions for publishers, categories, and games
- `db/transforms.ts` — deterministic CSV parsing and title-based rating logic
- `db/seed.ts` — idempotent seeding from `db/games.csv`
- `db/migrate.ts` — migration runner
- `db/test-helpers.ts` — in-memory SQLite setup for tests
- `src/lib/db.ts` — database client creation and configuration
- `src/lib/games.ts` — typed helper functions for queries and ordering

### Content model

The app stores the following core entities:

- Games
  - title
  - description
  - publisher ID
  - category ID
  - star rating
  - support/pledge data
- Publishers
  - name
  - description
- Categories
  - name
  - description

The data is seeded from `db/games.csv` and transformed into normalized relational records via Drizzle and SQLite.

## Directory structure

```text
.
├── .github/
│   ├── instructions/
│   ├── skills/
│   ├── workflows/
│   └── ...
├── db/
│   ├── migrations/
│   ├── schema.ts
│   ├── transforms.ts
│   ├── seed.ts
│   ├── migrate.ts
│   ├── games.csv
│   └── test-helpers.ts
├── src/
│   ├── components/
│   ├── layouts/
│   ├── lib/
│   ├── pages/
│   ├── styles/
│   └── types/
├── e2e-tests/
├── public/
├── astro.config.mjs
├── drizzle.config.ts
├── eslint.config.js
├── package.json
├── playwright.config.ts
├── tsconfig.json
├── tsconfig.tsgo.json
├── vitest.config.ts
├── README.md
├── LICENSE
└── ...
```

## Features

### Catalog browsing

The home page displays game cards for every seeded title, including:

- title
- short description
- publisher tag
- category tag
- star rating
- direct link to the details page

### Filtering and search

Users can filter the catalog using:

- free-text title search
- category selection
- publisher selection
- clearing all selections back to the complete list

Filtering logic is applied in the browser over the content already rendered at build time, which keeps the static-site architecture intact.

### Game detail pages

Every game gets a static URL under `/game/:id` via Astro dynamic routes. The detail page includes:

- game overview
- publisher information
- category context
- star rating
- support action
- navigation back to the home page

### 404 experience

Unknown routes render a branded 404 page, which is an actual static 404 under Astro's static output model.

### Accessibility

The project emphasizes accessible patterns:

- semantic landmarks (`main`, `nav`, `article`)
- keyboard-friendly navigation
- visible focus states
- ARIA labels where needed
- contrast-aware dark theme styling
- browser automation checks for accessibility violations

### Deterministic ratings

Game star ratings are generated from a stable hash of the title, ensuring build output remains reproducible and testable.

## Local development setup

### Requirements

- Node.js 22.13 or later
- npm
- Chromium for Playwright testing

### Install dependencies

```bash
npm ci
npx playwright install chromium
```

The browser install step is needed only for end-to-end tests.

## Running the app

### Start the dev server

```bash
npm run dev
```

This triggers the `predev` hook, which runs:

```bash
npm run db:setup
```

The `db:setup` command runs migrations and seeds the local SQLite database before Astro starts.

Then open the local site in a browser at:

```text
http://localhost:4321
```

### Production build

```bash
npm run build
```

This also runs the `prebuild` hook, which migrates and seeds the database before the static site is generated.

### Preview the built app

```bash
npm run preview
```

## Database workflow

The database source of truth is `db/games.csv`, and all schema changes should be managed through Drizzle migrations.

### Common commands

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:setup
```

### What each command does

- `db:generate` — generates a migration based on changes in `db/schema.ts`
- `db:migrate` — applies migrations to the local SQLite database
- `db:seed` — seeds the database from `db/games.csv`
- `db:setup` — migrates and seeds in one step

The local database is stored at `tailspin.db` and is ignored by Git.

> Note: because seeding is intentionally idempotent, local updates to `db/games.csv` can require removing the current SQLite file and re-running the database setup.

## Scripts

The repository's available npm scripts are:

```bash
npm run dev
npm run build
npm run preview
npm run astro
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:setup
npm run test:unit
npm run test:e2e
npm run test:e2e:install
npm run typecheck
npm run typecheck:astro
npm run typecheck:all
npm run lint
```

## Testing

### Unit tests

The unit tests validate the pure transforms and the data access helpers. They use a fresh in-memory SQLite database for each test.

```bash
npm run test:unit
```

Coverage includes:

- transform correctness
- deterministic ratings
- ordering guarantees
- lookup and not-found behavior
- empty-state logic

### End-to-end tests

The Playwright suite checks the browser experience across pages, navigation, filters, accessibility, and 404 behavior.

```bash
npm run test:e2e
```

The test runner builds the app and previews the static output before executing specs, mirroring the production workflow.

### Type checking

```bash
npm run typecheck
npm run typecheck:astro
npm run typecheck:all
```

The project uses:

- `tsgo` for the TypeScript-native type check of app logic and data layer files
- `astro check` for Astro-specific validation

### Linting

```bash
npm run lint
```

ESLint enforces code quality and catches TypeScript, Astro, and formatting issues.

## Code standards and conventions

This project follows a set of strict contributor conventions defined in the repo's instruction files:

- Astro pages and components use static data fetching in frontmatter
- Reusable components include documented `Props` interfaces
- Database helpers accept an injectable `db` dependency for testability
- Exported data-layer functions include TSDoc comments
- Use explicit TypeScript types everywhere
- Follow two-space indentation and semicolon-terminated syntax
- Use Tailwind utility classes as the primary styling method
- Keep the UI dark-themed and accessible

## Background and project intent

Tailspin Toys is a themed example application, not a production crowdfunding platform. It is intentionally lightweight and focused on demonstrating how to combine:

- static-site architecture
- relational data modeling
- migration-driven schema evolution
- data seeding from CSV content
- build-time queries in Astro
- front-end filtering and accessibility patterns

## Contribution notes

To work on the project locally:

1. Clone the repository
2. Ensure Node.js 22.13+ is installed
3. Run `npm ci`
4. Start with `npm run dev` or build with `npm run build`
5. Use the test scripts before finalizing changes

## License

This project is distributed under the MIT license. See [LICENSE](./LICENSE) for the complete text.

## Support and maintenance

This project is intended for learning, prototyping, and validation. If you want to extend it, the best starting points are:

- `db/schema.ts` for data modeling changes
- `db/seed.ts` and `db/games.csv` for content updates
- `src/lib/games.ts` for query logic and ordering
- `src/pages/index.astro` and `src/pages/game/[id].astro` for UI and routing behavior

## Final verification status

The project was validated successfully with:

- Type checking
- Unit tests
- Linting
- Production build
- Playwright end-to-end tests

All verification checks pass in the current repository state.
