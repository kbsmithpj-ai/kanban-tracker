# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (Vite)
npm run build    # TypeScript compile + Vite production build
npm run lint     # ESLint
npm run preview  # Preview production build
```

## Architecture

### Backend (Supabase)

The app uses **Supabase** for authentication, database, and real-time sync.

**Database Tables:**
- `team_members` - User profiles linked to auth.users (id, user_id, name, initials, avatar_color, email, is_admin)
- `tasks` - Task data (id, title, description, status, category, priority, assignee_id, due_date, order)

**Row Level Security (RLS):**
- Team members can view/create/update/delete tasks
- Team members can view all team members
- Admins can manage team members
- Users can create their own team_member record on signup

**Environment Variables** (`.env.local`):
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### State Management

Five React Contexts manage application state:

- **AuthContext** (`src/context/AuthContext.tsx`): Authentication state, sign in/up/out, current user and team member profile.
- **TeamContext** (`src/context/TeamContext.tsx`): Team members list with real-time sync from Supabase.
- **TaskContext** (`src/context/TaskContext.tsx`): Task CRUD, drag-drop reordering, auto-detection of past-due status. Persists to Supabase with real-time sync.
- **FilterContext** (`src/context/FilterContext.tsx`): Filter state (assignee, categories, statuses, search). Persists to localStorage.
- **UIContext** (`src/context/UIContext.tsx`): View mode (kanban/month/week/day), selected date, modal state, sidebar toggle. In-memory only.

Access contexts via hooks: `useAuth()`, `useTeam()`, `useTasks()`, `useFilters()`, `useUI()`.

### Data Flow
1. `AuthProvider` wraps the app and manages authentication state
2. `AuthenticatedApp` only renders main content after successful login
3. `TeamProvider` and `TaskProvider` fetch data from Supabase and subscribe to real-time changes
4. `useFilteredTasks` hook combines task data with active filters
5. Components consume filtered data via `getFilteredTasksByStatus(status)`
6. All mutations go through context functions (e.g., `addTask`, `updateTask`, `moveTask`)

### Domain Types
- **TaskStatus**: `'planning' | 'in-progress' | 'completed' | 'past-due'`
- **TaskCategory**: `'seed-pro' | 'agronomy' | 'sales' | 'testing' | 'samples'`
- **TaskPriority**: `'low' | 'medium' | 'high' | 'urgent'`

Note: `'past-due'` is a computed status (not stored in DB). Tasks are stored as `'planning'`, `'in-progress'`, or `'completed'`.

Past-due status is computed automatically via `getEffectiveStatus()` when a task has an overdue date and isn't completed.

### Component Organization
```
src/components/
├── auth/       # LoginPage
├── common/     # Button, Input, Select, Modal, Avatar, Badge
├── kanban/     # KanbanBoard, KanbanColumn, TaskCard
├── calendar/   # CalendarHeader, MonthView, WeekView, DayView
├── filters/    # FilterBar, CategoryFilter, StatusFilter, AssigneeFilter, SearchFilter
├── layout/     # Header, Sidebar, MainContent
└── task/       # TaskForm, TaskModal
```

Each component has a folder with `ComponentName.tsx`, `ComponentName.module.css`, and `index.ts` barrel export.

### Styling
- **Neo-brutalism design system** defined in `src/styles/neo-brutalism.css`
- CSS custom properties for colors, spacing, borders, shadows
- CSS Modules for component-scoped styles
- Key visual properties: 3px borders, 4px offset shadows, 8px border radius
- Font: Space Grotesk

### Key Dependencies
- **@supabase/supabase-js**: Supabase client for auth, database, and real-time
- **@dnd-kit/core + @dnd-kit/sortable**: Drag-and-drop for kanban columns
- **date-fns**: Date manipulation for calendar views
- **nanoid**: Unique ID generation (used for optimistic updates)

### Constants
Statuses, categories, and team members are defined in `src/constants/` with their display labels and colors. Use `getStatusConfig()`, `getCategoryConfig()`, and `getTeamMember()` helpers.

### Supabase Setup

To set up a new Supabase project:
1. Create project at supabase.com
2. Run the database schema SQL (creates tables, indexes, triggers, RLS policies)
3. Enable Realtime for `tasks` and `team_members` tables (Database → Replication)
4. Disable email confirmation for development (Authentication → Settings)
5. Copy Project URL and anon key to `.env.local`
