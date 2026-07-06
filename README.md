# NAVHUB Guide

NAVHUB Guide is a local-first bookmark dashboard built with Vue 3 and Vite. It supports categories, pinned shortcuts, keyboard navigation, system-aware theme defaults, JSON export, and JSON import.

## Features

- Local bookmark storage through `localStorage`
- Category filters, tag filters, grouped bookmark sections, and category management
- Search across title, URL, category, hostname, and tags, including field queries such as `domain:github`
- Pinned shortcuts in the quick-launch dock
- Edit pinned shortcuts or remove them from the dock without deleting the bookmark
- Keyboard shortcuts, command palette, search history, and theme cycling
- JSON and browser bookmark HTML import/export with validation and duplicate URL merging
- Automatic backups, local undo snapshots, and backup restore
- Bookmark visit statistics with smart, recent, frequent, and stale sorting
- Cleanup tools for duplicate links, stale bookmarks, empty categories, and low-frequency tags
- Icon privacy modes: text-only, direct site favicon, or Google favicon service
- Production PWA cache with an in-app update prompt

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
- `Ctrl/Cmd + K`: open command palette
- `1`-`9`: select category
- `0`: show all categories
- `T`: cycle theme
- `?`: open keyboard help

## Data

Bookmarks are stored in the browser under the `guide_bookmarks` key. Related local keys include `guide_categories`, `guide_backups`, `guide_undo_snapshots`, `guide_settings`, `guide_collapsed_categories`, and `guide_search_history`.

Export creates `navhub-bookmarks.json` with bookmarks, category metadata, backups, and settings. Import accepts the current versioned object shape, legacy arrays, and browser bookmark HTML. Invalid entries are sanitized before merging by URL.

```json
{
  "version": 4,
  "bookmarks": [
    {
      "id": "g1",
      "title": "GitHub",
      "url": "https://github.com/",
      "cat": "开发",
      "icon": "",
      "faviconUrl": "",
      "pin": true,
      "tags": ["code"]
    }
  ],
  "categories": [{ "name": "开发", "order": 0, "hidden": false }],
  "settings": { "iconMode": "text" }
}
```

Use the Settings panel to switch icon mode and inspect local storage usage. Use JSON export before clearing browser data or moving to another machine.

## Development

```sh
pnpm install
pnpm run dev
```

## Quality Checks

```sh
pnpm run type-check
pnpm run test
pnpm run lint
```

## Build

```sh
pnpm build
```

Production builds use `/guide/` as the Vite base path.
