# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Pre-Comm Team Kanban Tracker** - A task management app for the Confluence Genetics Pre-Commercial team.

**Production URL:** https://kanban-tracker-six.vercel.app

## Commands

```bash
npm run dev      # Start development server (Vite)
npm run build    # TypeScript compile + Vite production build
npm run lint     # ESLint
npm run preview  # Preview production build
```

## Deployment

The app is deployed to **Vercel** and auto-deploys on push to `main`.

- Production: https://kanban-tracker-six.vercel.app
- Vercel project: `kbsmiths-projects/kanban-tracker`
- GitHub repo: `kbsmithpj-ai/kanban-tracker`

Environment variables are configured in Vercel dashboard.

## Architecture

### Backend (Supabase)

The app uses **Supabase** for authentication, database, and real-time sync.

**Database Tables:**
- `team_members` - User profiles linked to auth.users (id, user_id, name, initials, avatar_color, email, is_admin)
- `tasks` - Task data (id, title, description, status, category, priority, assignee_id, due_date, completed_at, order)
- `error_logs` - Error logging for debugging (id, user_id, severity, message, context, stack_trace, url, user_agent, created_at)

**Row Level Security (RLS):**
- Team members can view/create/update/delete tasks
- Team members can view all team members
- Admins can manage team members
- Users can create their own team_member record on signup
- All authenticated users can insert error logs
- Only admins can view error logs

**Supabase URL Configuration** (Authentication → URL Configuration):
- Site URL: `https://kanban-tracker-six.vercel.app`
- Redirect URLs: `https://kanban-tracker-six.vercel.app`, `https://kanban-tracker-six.vercel.app/reset-password`
- For local dev, also add `http://localhost:5173` and `http://localhost:5174`

**Environment Variables** (`.env.local`):
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### State Management

Six React Contexts manage application state:

- **AuthContext** (`src/context/AuthContext.tsx`): Authentication state, sign in/up/out, password reset/recovery, current user and team member profile. Auto-links pending team_member records on sign-in.
- **TeamContext** (`src/context/TeamContext.tsx`): Team members list with real-time sync from Supabase. Includes `inviteTeamMember()` for admin invitations.
- **TaskContext** (`src/context/TaskContext.tsx`): Task CRUD, drag-drop reordering, auto-detection of past-due status, automatic `completedAt` timestamp management on status transitions. Persists to Supabase with real-time sync. Uses optimistic updates with rollback on failure.
- **FilterContext** (`src/context/FilterContext.tsx`): Filter state (assignee, categories, statuses, search). Persists to localStorage.
- **UIContext** (`src/context/UIContext.tsx`): View mode (kanban/month/week/day), selected date, modal state (task modal, invite modal, error log modal), sidebar toggle. In-memory only.
- **ToastContext** (`src/context/ToastContext.tsx`): Toast notification system for showing success/error messages. Used for task operation feedback.

Access contexts via hooks: `useAuth()`, `useTeam()`, `useTasks()`, `useFilters()`, `useUI()`, `useToast()`.

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

### Completed Task Behavior
- Tasks store a `completed_at` timestamp (DB) / `completedAt` (app) that is auto-set when status transitions to `'completed'` and cleared when moved away from completed.
- In calendar views (Month/Week/Day), completed tasks appear on their **completion date** (not due date), using `getCalendarDateKey()` from `src/utils/date.ts`.
- Completed tasks have distinct visual styling: green outline/shadow (`--color-completed`), green background tint (`--color-completed-bg`), checkmark prefix, and strikethrough title. CSS variables auto-adapt to dark mode.

### Authentication Flows

**Sign In/Sign Up:** Standard email + password authentication via Supabase.

**Password Reset:**
1. User clicks "Forgot password?" → enters email
2. Supabase sends recovery email with magic link
3. Link contains `#type=recovery` hash → app detects and shows password reset form
4. `AuthContext.updatePassword()` sets new password via Supabase

**Team Member Invitation (Admin only):**
1. Admin clicks "Invite" button in header → InviteModal opens
2. Enter email and name → sends magic link via `supabase.auth.signInWithOtp()`
3. Creates pending `team_member` record with `user_id: null`
4. Invited user clicks link → AuthContext auto-links pending record to their `user_id`
5. User is now a full team member with RLS access to create/view tasks

### Component Organization
```
src/components/
├── admin/      # ErrorLogModal (admin-only error log viewer)
├── auth/       # LoginPage (login, signup, forgot-password, reset-password modes)
├── common/     # Button, Input, Select, Modal, Avatar, Badge, Toast, ErrorBoundary
├── kanban/     # KanbanBoard, KanbanColumn, TaskCard
├── calendar/   # CalendarHeader, MonthView, WeekView, DayView
├── filters/    # FilterBar, CategoryFilter, StatusFilter, AssigneeFilter, SearchFilter
├── layout/     # Header (with Invite and Errors buttons for admins), Sidebar, MainContent
├── task/       # TaskForm, TaskModal
└── team/       # InviteModal
```

Each component has a folder with `ComponentName.tsx`, `ComponentName.module.css`, and `index.ts` barrel export.

### Error Handling & Toast Notifications

The app uses a toast notification system to provide feedback for operations:

- **ToastContext** provides `showToast()`, `showError()`, `showSuccess()` functions
- **Toast component** displays notifications in top-right corner
- **Variants**: error (red), success (green), warning (gold), info (cyan)
- **Auto-dismiss**: Errors after 8s, success/info after 5s

**Task operations with error handling:**
- All task CRUD operations use optimistic updates (show changes immediately)
- If Supabase returns an error, the change is rolled back and an error toast is shown
- TaskModal stays open on failure so users can retry
- Prevents silent failures (e.g., RLS rejecting inserts for unlinked users)

### Error Logging System

The app includes a persistent error logging system for debugging production issues:

**Error Logger Utility** (`src/utils/errorLogger.ts`):
- `logError(message, options)` - Fire-and-forget logging to `error_logs` table
- `logInfo()`, `logWarning()`, `logCritical()` - Convenience wrappers
- Auto-captures: user ID, browser URL, user agent, stack trace

**Integration Points:**
- TaskContext: addTask, updateTask, deleteTask, moveTask, reorderTasks
- AuthContext: session errors, team member fetch/link errors, signup errors
- TeamContext: fetchTeamMembers, addTeamMember, removeTeamMember, inviteTeamMember
- ErrorBoundary: Catches uncaught React errors and logs them as critical

**Admin Error Log Viewer:**
- Access via red "Errors" button in Header (admin-only)
- Filter by severity (info/warning/error/critical) and date range
- Expandable rows show full context JSON and stack traces

### Styling
- **Neo-brutalism design system** defined in `src/styles/neo-brutalism.css`
- **Confluence Genetics brand colors:**
  - `--brand-navy: #1a2744` (primary background, borders, shadows)
  - `--brand-cyan: #00a8e8` (accent color, links, in-progress status)
  - `--brand-green: #4cb944` (completed status, agronomy category)
  - `--brand-gold: #f5b800` (planning status, sales category)
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
