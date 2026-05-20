# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build/Lint/Test Commands

- `bun run dev` - Start development server
- `bun run build` - Build for production
- `bun run lint` - Run linting checks
- `bun run format` - Format code with Prettier
- `bun run check` - Type check with svelte-check
- `bun run test` - Run all tests
- `bun run test:unit -- -t "test name"` - Run a single test

## Architecture Overview

### Multi-Space Architecture

The app supports multiple "espaces" (workspaces) that users can switch between. Each space has its own events, messages, and permissions. Space context is managed through layout files (`/dashboard/[spaceName]/+layout.svelte`) and provided to child components via Svelte's `setContext`.

### State Management - SyncStore Pattern

The core of the state management is the `SyncStore` class (`src/lib/shared/syncState.svelte.ts`):

- **Reactive**: Uses Svelte 5 runes (`$state`, `$derived`, `$effect`)
- **Hybrid Storage**: Supports both IndexedDB (persistent) and memory-only (temporary) modes via `DbManagerFactory`
- **Synchronization**: Bi-directional sync with PocketBase using `PocketBaseSyncer`
- **Indexing**: Custom `IndexManager` for fast queries on non-primary keys
- **Cache**: LRU cache with configurable limits
- **Pagination**: Built-in pagination with lazy loading

### Store Specialization

Different stores follow the same `SyncStore` pattern but with specific configurations:

- `eventsStore`: Manages events with space-specific filtering
- `globalMessagesStore`: Singleton for user's participating conversations (real-time sync)
- `messageManager`: Orchestrator that uses global store for participants, creates memory stores for observers
- `conversationDirectoryStore`: Manages conversation metadata
- `userDb`: User-specific data storage

### Message Store Architecture

The message system uses a **dual storage strategy**:

1. **Global store** for conversations where the user is a participant - persisted in IndexedDB
2. **Memory-only stores** for non-participating conversations - prevents cache pollution

This pattern is implemented in `messageStore.svelte.ts` via the `MessageManagerService` class.

### Database/PocketBase Integration

- **PocketBase** as backend (v0.36.2)
- **Sync strategies**: real-time (WebSocket), interval, or manual
- **Incremental sync**: Uses `updated > timestamp` filtering
- **Automatic pruning**: Removes local records that no longer exist on server
- **Generated types**: Use `pocketbase-typegen` for type safety

### Component Organization

```
src/lib/components/
├── ui/              # Reusable UI components (shadcn/ui style)
├── ui-custom/       # Custom UI components
├── eventscard/      # Event-specific components
└── forModal/        # Modal form components
```

### Routing Structure

- `/dashboard/[spaceName]/...` - Space-scoped routes
- `+layout.svelte` initializes stores and provides context
- `+layout.ts` loads server data (space info, user permissions)

## Code Style Guidelines

- **Language**: French for comments, documentation, and UI text
- **Components**: Use Svelte 5 runes (`$state`, `$derived`, `$effect`, `$props`, `$bindable`)
- **CSR**: Client-side rendering SvelteKit project with Cloudflare adapter
- **Types**: Strict TypeScript with interfaces for all props and configurations
- **Reactivity**: Use classes with `$state` for shared reactive state in `.svelte.ts` files
- **Style**: Tailwind CSS v4 and DaisyUI
- **Navigation**: Use `navigationStore` from `src/lib/shared/navigation.svelte.ts` for menu items

## Important Notes

- Do not remove existing comments or rename variables/functions unless explicitly requested
- Use modern ES6+ features (arrow functions, const/let, etc.)
- Write tests only in `src/lib/test/`
- When creating new stores, follow the `StoreConfig` interface pattern from `syncState.types.ts`
- Use `DbManagerFactory` to create storage managers (IndexedDB vs memory)
- Initialize stores in the appropriate layout file, not in components
