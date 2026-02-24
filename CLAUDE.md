# CLAUDE.md

## Project Overview

**Pre-Comm Team Kanban Tracker** - Task management app for the Confluence Genetics Pre-Commercial team.
React 19, TypeScript, Vite, Supabase. Auto-deploys to Vercel on push to `main`.

**Production:** https://kanban-tracker-six.vercel.app

## Commands

```bash
npm run dev      # Start dev server
npm run build    # TypeScript compile + Vite production build
npm run lint     # ESLint
```

## Architecture

### Supabase (Backend)

**Tables:** `tasks`, `team_members`, `error_logs`
**RLS:** Team members CRUD tasks; admins manage team members; only admins view error logs.

### State Management

Six contexts, accessed via hooks: `useAuth()`, `useTeam()`, `useTasks()`, `useFilters()`, `useUI()`, `useToast()`.

All task mutations use optimistic updates with rollback on Supabase errors. `useFilteredTasks` hook combines tasks with active filters.

### Domain Types

- **TaskStatus**: `'planning' | 'in-progress' | 'completed' | 'past-due'`
- **TaskCategory**: `'seed-pro' | 'agronomy' | 'sales' | 'testing' | 'samples'`
- **TaskPriority**: `'low' | 'medium' | 'high' | 'urgent'`

`'past-due'` is computed (not stored in DB) via `getEffectiveStatus()` when a task is overdue and not completed.

### Completed Tasks

`completed_at` is auto-set on status transition to `'completed'`, cleared when moved away. In calendar views, completed tasks appear on their **completion date** (not due date) via `getCalendarDateKey()`.

### Component Pattern

Each component: `ComponentName/ComponentName.tsx` + `ComponentName.module.css` + `index.ts` barrel.

Statuses, categories defined in `src/constants/` with CSS variable colors. Use `getStatusConfig()`, `getCategoryConfig()`.

## Styling Rules

- Theme defined in `src/styles/neo-brutalism.css` (historical name; clean modern theme, not brutalist)
- Light/dark mode via `ThemeContext` + `[data-theme="dark"]` CSS selectors
- **Never hardcode hex colors** -- always use CSS custom properties
- Dark mode surface hierarchy: `--color-off-white` (page) < `--color-white` (cards) < `--color-gray-200` (buttons/inputs/chips)
- Use `[data-theme="dark"]` overrides with `--color-gray-200` bg for interactive elements inside same-color containers
- Filter chips must not set inline `backgroundColor` when unselected -- CSS handles dark mode
