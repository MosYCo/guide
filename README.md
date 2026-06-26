# NAVHUB Guide

NAVHUB Guide is a local-first bookmark dashboard built with Vue 3 and Vite. It supports categories, pinned shortcuts, keyboard navigation, system-aware theme defaults, JSON export, and JSON import.

## Features

- Local bookmark storage through `localStorage`
- Category filters and grouped bookmark sections
- Search across title, URL, category, and hostname
- Pinned shortcuts in the quick-launch dock
- Edit pinned shortcuts or remove them from the dock without deleting the bookmark
- Keyboard shortcuts for search, navigation, category switching, and theme cycling
- JSON export and import with validation and duplicate URL merging

## Configuration

Set the app name with `VITE_APP_NAME`. The value is used for the browser tab title and topbar brand.

```sh
VITE_APP_NAME=NAVHUB pnpm dev
```

## Keyboard Shortcuts

- `/`: focus search
- `Arrow keys`: move bookmark focus
- `Enter`: open focused bookmark
- `Esc`: clear search/filter or close dialogs
- `Ctrl/Cmd + N`: add bookmark
- `1`-`9`: select category
- `0`: show all categories
- `T`: cycle theme
- `?`: open keyboard help

## Data

Bookmarks are stored in the browser under the `guide_bookmarks` key. Export creates `navhub-bookmarks.json`; import accepts the same array shape and sanitizes invalid entries before merging by URL.

```json
[
  {
    "id": "g1",
    "title": "GitHub",
    "url": "https://github.com/",
    "cat": "开发",
    "icon": "",
    "faviconUrl": "",
    "pin": true
  }
]
```

## Development

```sh
pnpm install
pnpm dev
```

## Quality Checks

```sh
pnpm run type-check
pnpm run build-only
pnpm run lint
```

## Build

```sh
pnpm build
```

Production builds use `/guide/` as the Vite base path.
