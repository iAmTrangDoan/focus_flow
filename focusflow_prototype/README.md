# FocusFlow - Smart Task & Time Management App

A modern, minimalist task management and productivity application built with **Vite**, **React 19**, **React Router**, **Tailwind CSS**, and **Recharts**.

## 📋 Project Overview

FocusFlow is a frontend-only React application designed to help users:
- ✅ Manage tasks efficiently
- 📅 Schedule work intelligently  
- ⏱️ Track focus time with Pomodoro
- 📊 Analyze productivity and procrastination patterns
- 🤖 Get AI-powered suggestions (mock)

### Design Philosophy
- **Minimalist** - Clean, spacious UI with clear hierarchy
- **Accessible** - Semantic HTML, proper contrast, keyboard navigation
- **Responsive** - Mobile-first design for all screen sizes
- **Vietnamese** - Full Vietnamese localization
- **Color System** - Tomato red (#e34432) as primary accent with warm whites and grays

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- pnpm (or npm/yarn)

### Installation

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

The app will open at `http://localhost:3000`

## 📁 Project Structure

```
src/
├── main.tsx              # App entry point
├── App.tsx               # Router setup & auth state
├── globals.css           # Design system & Tailwind config
│
├── layouts/
│   └── DashboardLayout.tsx   # Main app layout with sidebar & topbar
│
├── pages/
│   ├── LandingPage.tsx       # Public landing page
│   ├── LoginPage.tsx         # Auth (login/signup mock)
│   ├── Dashboard.tsx         # Main dashboard with overview
│   ├── TaskManagement.tsx    # Task CRUD & filtering
│   ├── Calendar.tsx          # Calendar views (month/week/day)
│   ├── FocusTimer.tsx        # Pomodoro timer
│   ├── AIPlanner.tsx         # AI-powered planning (mock)
│   ├── Analytics.tsx         # Productivity reports & charts
│   └── Settings.tsx          # User preferences
│
└── services/
    └── mockData.ts           # Mock data for all features
```

## 🎨 Design System

### Colors
- **Primary**: `#e34432` (Tomato Red) - CTAs, active states
- **Background**: `#fefdfc` (Warm White)
- **Surface**: `#ffffff` (Pure White)
- **Text Primary**: `#25221e` (Dark Charcoal)
- **Text Secondary**: `#6f6c69` (Medium Gray)
- **Border**: `#d7d6d4` (Light Gray)
- **Success**: `#4c7a45`
- **Warning**: `#f5a623`

### Typography
- **Sans-serif**: System fonts (Inter fallback)
- **Headings**: Bold, tight leading
- **Body**: Regular weight, 1.4-1.6 line-height

### Components
- Border radius: `6px` (badges) → `15px` (buttons)
- Shadows: Very subtle (`rgba(37, 34, 30, 0.04)`)
- Spacing: Tailwind scale (4px units)

## 📱 Key Features (5 Main Screens)

### 1. **Dashboard** (`/dashboard`)
- Quick overview of today's tasks
- Statistics cards (completed, delayed, focus time)
- Today's timeline with scheduled blocks
- Priority tasks list
- Weekly productivity chart
- AI insights
- CTA to start focus session

### 2. **Task Management** (`/tasks`)
- Create, read, update, delete tasks
- Filter by status (todo, in-progress, completed, delayed)
- Search functionality
- List & board (kanban) views
- Task properties: priority, deadline, project, subtasks
- Inline editing

### 3. **Calendar** (`/calendar`)
- Month/week/day views
- Task blocks with color-coding
- Overdue task highlighting
- Unscheduled tasks sidebar
- "Auto-schedule" mock button
- Task details modal on click

### 4. **Focus Timer** (`/focus`)
- Large countdown timer display
- 3 modes: Pomodoro (25m), Short Break (5m), Long Break (15m)
- Current task display
- Ambient focus controls (sound toggle)
- Quick notes for distractions
- Session completion modal with focus level rating

### 5. **AI Planner** (`/ai-planner`)
- Goal input form
- Deadline, estimated time, difficulty, energy level
- Mock AI plan generation
- Task breakdown suggestions
- Priority scoring
- Procrastination risk warnings
- Improvement recommendations

**Bonus Screens**:
- **Analytics** (`/analytics`): Charts, stats, hourly heatmap
- **Settings** (`/settings`): Preferences, Pomodoro config, notifications
- **Landing Page** (`/`): Public marketing site
- **Login** (`/login`): Mock authentication

## 🔌 Integration Ready

The codebase is structured to easily connect to a NestJS REST API:

### Services Layer
All mock data is centralized in `src/services/mockData.ts`. To connect to a backend:

```typescript
// Example: Replace mock data with API calls
const tasks = await fetch('/api/tasks')
const focusSessions = await fetch('/api/sessions')
```

### API Endpoints (Ready for NestJS Backend)
```
GET  /api/tasks              # List all tasks
POST /api/tasks              # Create task
PUT  /api/tasks/:id          # Update task
DELETE /api/tasks/:id        # Delete task

GET  /api/focus-sessions     # Get sessions
POST /api/focus-sessions     # Save session

GET  /api/analytics          # Analytics data
POST /api/ai-planner         # AI suggestions (Claude, GPT, etc.)

GET  /api/user               # User profile
PUT  /api/user               # Update settings
```

## 🎯 Mock Data Included

The app comes with realistic mock data:

### Tasks
- 6 sample tasks related to thesis work
- Multiple statuses, priorities, and deadlines
- Subtasks for each main task
- Various projects: "Luận văn tốt nghiệp", "Học tập", "Cá nhân"

### Statistics
- 7-day completion tracking
- Monthly productivity data
- Hourly productivity heatmap
- Focus session logs

### User Profile
- Name: "Huyền Trang"
- Work hours: 8:00 - 22:00
- Pomodoro settings: 25/5/15 minutes

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Build Tool** | Vite 5 |
| **Runtime** | React 19 |
| **Router** | React Router v6 |
| **Styling** | Tailwind CSS v4 |
| **UI Components** | Radix UI (minimal set) |
| **Icons** | Lucide React |
| **Charts** | Recharts |
| **Forms** | React Hook Form |
| **Language** | TypeScript 5 |

## 📦 Dependencies

### Core
- `react@^19` - React framework
- `react-dom@^19` - React DOM
- `react-router-dom@^6.23.0` - Client-side routing

### UI & Styling
- `tailwindcss@^4.2.0` - Utility-first CSS
- `lucide-react@^0.564.0` - SVG icons
- `recharts@2.15.0` - React charts library

### Form & Validation
- `react-hook-form@^7.54.1` - Form state management
- `zod@^3.24.1` - TypeScript-first schema validation

### Radix UI (Accessible components)
- Selected essential components only (dialog, select, separator, etc.)

## 🚨 Important Notes

### No Backend
This is a **frontend-only** application with mock data. To use with a real backend:

1. Create a NestJS API service
2. Replace `mockData.ts` with API calls
3. Add environment variables for API URL
4. Implement proper error handling & loading states

### No Authentication
Login is currently mocked. To add real auth:
1. Connect to Passport.js, Auth0, or similar
2. Store JWT/tokens in secure storage
3. Add protected route middleware
4. Implement logout and session management

### State Management
Currently using local React state. For a larger app, consider:
- `SWR` for data fetching & caching
- `React Context` + hooks for shared state
- `TanStack Query` for server state
- `Zustand` or `Jotai` for client state

## 🎨 Customization

### Change Brand Color
Edit `src/globals.css`:
```css
:root {
  --color-primary: #your-color;
  --color-primary-dark: #darker-shade;
  --color-primary-light: #lighter-shade;
}
```

### Update Mock Data
Edit `src/services/mockData.ts` to change:
- Tasks and projects
- User profile info
- Statistics and insights
- Available options and enums

### Modify Layout
- `DashboardLayout.tsx` - Sidebar, topbar, responsive behavior
- `globals.css` - Theme variables and utility classes
- `tailwind.config.ts` - (if created) Tailwind configuration

## 📝 Scripts

```bash
pnpm dev      # Start dev server (http://localhost:3000)
pnpm build    # Build for production
pnpm preview  # Preview production build locally
```

## 🔍 File Sizes

- Bundle: ~200KB (gzipped)
- Initial load: Fast with Vite's code splitting
- No external image assets (uses component illustrations)

## 🌐 Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Android)

## 📄 License

This project is open source and available under the MIT License.

## 🎓 Learning Resources

- [Vite Documentation](https://vitejs.dev/)
- [React 19 Docs](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [React Router](https://reactrouter.com/)
- [Recharts Examples](https://recharts.org/)

---

**Built with ❤️ for focused productivity**
