# Repository Guidelines

## Project Structure & Module Organization

This repository is a Vue 3 + Vite bookmark dashboard. Application code lives in `src/`.

- `src/App.vue` wires the main page, modal, filters, imports, exports, and toast flow.
- `src/features/bookmarks/` contains bookmark types, constants, storage helpers, composables, and feature components.
- `src/shared/` contains reusable UI components, app config, and shared composables.
- `src/styles/` contains global SCSS for base styles, theme variables, and the Navhub layout.
- Focused tests are colocated with source files as `*.test.ts`.
- Static files are in `public/`; compiled output is generated in `dist/` and should not be committed.

## Build, Test, and Development Commands

Use `pnpm` to match the checked-in `pnpm-lock.yaml`.

- `pnpm install`: install dependencies.
- `pnpm run dev`: start the Vite development server.
- `pnpm run type-check`: run `vue-tsc --build` for TypeScript and Vue template checks.
- `pnpm run test`: run Vitest unit tests in jsdom.
- `pnpm run build`: run type checking and create a production build.
- `pnpm run preview`: serve the production build locally.
- `pnpm run lint`: run ESLint with auto-fix enabled.
- `pnpm run format`: format files under `src/` with Prettier.

## Coding Style & Naming Conventions

Use TypeScript and Vue single-file components with `<script setup lang="ts">`. Follow the existing two-space indentation and concise composition API style. Name Vue components in PascalCase, for example `BookmarkModal.vue`; name composables with `use` prefixes, for example `useBookmarks.ts`. Keep feature-specific logic under `src/features/bookmarks/` and generic UI or utilities under `src/shared/`.

Prefer typed helpers and Vue computed state over ad hoc DOM or string manipulation.

## Testing Guidelines

Use Vitest for focused unit tests and colocate files near the changed module, for example `src/features/bookmarks/storage.test.ts`. Cover storage parsing, localStorage persistence, bookmark mutations, and ordering helpers when changing data behavior.

For UI behavior changes, run `pnpm run dev` and manually verify bookmark creation, editing, filtering, import/export, Dock ordering, and localStorage persistence.

## Commit & Pull Request Guidelines

Recent commits use short, imperative messages such as `fix bookmark category dropdown` and `support custom bookmark favicons`. Keep commits scoped to one logical change.

Pull requests should include a brief description, validation commands run, screenshots or short recordings for UI changes, and linked issues when applicable. Call out localStorage schema changes or import/export compatibility concerns explicitly.
