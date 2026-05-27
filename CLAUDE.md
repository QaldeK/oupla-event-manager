# CLAUDE.md - Oupla Project Guidelines

## Build/Lint/Test Commands

- `bun run dev` - Start development server
- `bun run build` - Build for production
- `bun run lint` - Run linting checks
- `bun run format` - Format code with Prettier
- `bun run check` - Type check with svelte-check
- `bun run test` - Run all tests
- `bun run test:unit -- -t "test name"` - Run a single test

## Code Style Guidelines

- **Language**: French for comments, documentation, and UI text
- **Components**: Use Svelte 5 runes (`$state`, `$derived`, `$effect`, `$props`, `$bindable`)
- **CSR**: We work on client side rendering sveltekit project
- **Types**: Use strict TypeScript typing, always define interfaces for props
- **Naming**: Clear, explicit; use camelCase for variables, PascalCase for components
- **Style**: Use Tailwind CSS and DaisyUI
- **DRY**: Avoid code duplication, extract reusable components and utilities
- **KISS**: Keep code simple and readable
- **Error Handling**: Always handle promises with proper error cases
- **State Management**: Use `.svelte.ts` files for shared state with proper accessors

## Important Notes

- Do not remove existing comments
- Do not rename variables or functions unless explicitly requested
- Use modern ES6+ features (arrow functions, const/let, etc.)
- Build optimized and performance-focused solutions
- Use the existing project structure and conventions
- write tests only in src/lib/test
