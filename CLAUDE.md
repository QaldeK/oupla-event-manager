# CLAUDE.md - Oupla Project Guidelines

## Build/Lint/Test Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run linting checks
- `npm run format` - Format code with Prettier
- `npm run check` - Type check with svelte-check
- `npm run test` - Run all tests
- `npm run test:unit -- -t "test name"` - Run a single test

## Code Style Guidelines
- **Language**: French for comments, documentation, and UI text
- **Components**: Use Svelte 5 runes (`$state`, `$derived`, `$effect`, `$props`, `$bindable`)
- **Types**: Use strict TypeScript typing, always define interfaces for props
- **Naming**: Clear, explicit naming in French; use camelCase for variables, PascalCase for components
- **Reactivity**: Use classes with `$state` for shared reactive state
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