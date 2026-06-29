# Repository Guidelines

## Project Structure & Module Organization

This repository is a Vue 3 + Vite bookmark dashboard. Application code lives in `src/`.

- `src/App.vue` wires the main page, modal, filters, imports, exports, and toast flow.
- `src/features/bookmarks/` contains bookmark types, constants, storage helpers, composables, and feature components.
- `src/shared/` contains reusable UI components, app config, and shared composables.
- `src/styles/` contains global SCSS for base styles, theme variables, and the Navhub layout.
- Static files are in `public/`; compiled output is generated in `dist/` and should not be committed.

There is no dedicated `tests/` directory at present.

## Build, Test, and Development Commands

Use `pnpm` to match the checked-in `pnpm-lock.yaml`.

- `pnpm install`: install dependencies.
- `pnpm run dev`: start the Vite development server.
- `pnpm run type-check`: run `vue-tsc --build` for TypeScript and Vue template checks.
- `pnpm run build`: run type checking and create a production build.
- `pnpm run preview`: serve the production build locally.
- `pnpm run lint`: run ESLint with auto-fix enabled.
- `pnpm run format`: format files under `src/` with Prettier.

## Coding Style & Naming Conventions

Use TypeScript and Vue single-file components with `<script setup lang="ts">`. Follow the existing two-space indentation and concise composition API style. Name Vue components in PascalCase, for example `BookmarkModal.vue`; name composables with `use` prefixes, for example `useBookmarks.ts`. Keep feature-specific logic under `src/features/bookmarks/` and generic UI or utilities under `src/shared/`.

Prefer typed helpers and Vue computed state over ad hoc DOM or string manipulation.

## Testing Guidelines

No unit test framework is currently configured. For now, validate changes with `pnpm run type-check` and `pnpm run build`. For UI behavior changes, manually verify the relevant flow in `pnpm run dev`, including bookmark creation, editing, filtering, import/export, and localStorage persistence.

If tests are added later, colocate focused specs near the changed feature or introduce a clear `src/**/*.spec.ts` convention.

## Commit & Pull Request Guidelines

Recent commits use short, imperative messages such as `fix bookmark category dropdown` and `support custom bookmark favicons`. Keep commits scoped to one logical change.

Pull requests should include a brief description, validation commands run, screenshots or short recordings for UI changes, and linked issues when applicable. Call out localStorage schema changes or import/export compatibility concerns explicitly.
