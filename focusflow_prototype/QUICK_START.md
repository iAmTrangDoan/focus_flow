# FocusFlow - Quick Start Guide

Get up and running in 60 seconds.

## 🚀 Start Development

```bash
# Already running! Visit:
http://localhost:3000
```

The Vite dev server is already running. Open that URL in your browser.

## 🎬 First Steps

1. **Landing Page** appears automatically
   - Explore the features section
   - Click "Bắt đầu miễn phí" button

2. **Login Page** loads
   - Email: `huyenT@example.com` (pre-filled)
   - Password: `password123` (pre-filled)
   - Click "Đăng nhập"

3. **Dashboard** appears
   - See your 6 tasks for the day
   - View stats: completed, delayed, focus time
   - Check the timeline and priority tasks
   - See your AI insights

4. **Explore Pages** (via sidebar)
   - **Công việc** - Full task management
   - **Lịch trình** - Calendar views
   - **Focus Timer** - Pomodoro timer
   - **AI Planner** - Planning tool
   - **Báo cáo** - Analytics & charts
   - **Cài đặt** - Settings

---

## 📁 Project Files

```
/src                          # Application code
  ├── main.tsx               # Entry point
  ├── App.tsx                # Router setup
  ├── globals.css            # Design system (colors, typography)
  ├── layouts/
  │   └── DashboardLayout.tsx    # Main layout with sidebar
  ├── pages/
  │   ├── LandingPage.tsx        # Homepage
  │   ├── LoginPage.tsx          # Auth
  │   ├── Dashboard.tsx          # Main dashboard
  │   ├── TaskManagement.tsx     # Task CRUD
  │   ├── Calendar.tsx           # 3-view calendar
  │   ├── FocusTimer.tsx         # Pomodoro
  │   ├── AIPlanner.tsx          # AI suggestions
  │   ├── Analytics.tsx          # Charts & reports
  │   └── Settings.tsx           # Preferences
  └── services/
      └── mockData.ts            # All mock data

/public                       # Static assets
/node_modules                # Dependencies (already installed)
index.html                    # Entry HTML
vite.config.ts               # Vite configuration
tsconfig.json                # TypeScript config
package.json                 # Dependencies
tailwind.config.ts           # Tailwind setup
```

---

## 🎨 Customization

### Change Brand Color

Edit `src/globals.css`:
```css
:root {
  --color-primary: #your-color;
}
```

### Update Mock Data

Edit `src/services/mockData.ts` to change:
- Tasks
- User profile
- Statistics
- Projects

### Modify Layout

Edit `src/layouts/DashboardLayout.tsx` to change:
- Sidebar items
- Topbar content
- Sidebar width

---

## 🔌 Connect Backend

To replace mock data with real API:

1. Create `src/services/api.ts` (see API_INTEGRATION.md)
2. Replace imports in pages:
   ```typescript
   // Old (mock)
   import { mockTasks } from '../services/mockData'
   
   // New (API)
   import { api } from '../services/api'
   const tasks = await api.get('/tasks')
   ```
3. Add `.env.local`:
   ```
   VITE_API_URL=http://localhost:3001/api
   ```

See **API_INTEGRATION.md** for detailed instructions.

---

## 📊 Key Features

### ✅ Landing Page
- Marketing site with hero section
- 6 feature cards
- How it works section
- Comparison table
- Call-to-action

### ✅ Dashboard
- Welcome greeting
- 4 stat cards
- Today's timeline
- Priority tasks
- Weekly chart
- AI insights

### ✅ Task Management
- Create/Read/Update/Delete
- List and board views
- 6 filters
- Search
- Priority badges
- Deadlines

### ✅ Calendar
- Month view
- Week view
- Day view
- Task blocks
- Color-coded by priority
- Unscheduled tasks sidebar

### ✅ Focus Timer
- Large SVG circular timer
- Pomodoro/Break modes
- Play/Pause/Reset
- Sound toggle
- Session completion modal
- Focus rating 1-5

### ✅ Bonus Pages
- **AI Planner** - Generate plans
- **Analytics** - Charts & heatmap
- **Settings** - User preferences

---

## 🛠️ Common Tasks

### View Source
```bash
# All TypeScript files
src/**/*.tsx
src/**/*.ts

# Styles
src/globals.css
```

### Edit a Page
```bash
# Example: Edit dashboard
src/pages/Dashboard.tsx
```

### Add a New Page
```bash
# 1. Create file
src/pages/NewPage.tsx

# 2. Add route in App.tsx
<Route path="/new-page" element={<NewPage />} />

# 3. Add sidebar link in DashboardLayout.tsx
```

### Change Colors
```bash
# Edit CSS variables
src/globals.css
:root { --color-primary: #yourcolor; }
```

### Update Mock Data
```bash
# Edit tasks, users, stats
src/services/mockData.ts
```

---

## 📚 Documentation

- **README.md** - Setup & features
- **PROJECT_SUMMARY.md** - Architecture
- **API_INTEGRATION.md** - Backend guide
- **COMPLETION_SUMMARY.md** - Project details

---

## 🚀 Build & Deploy

### Build for Production
```bash
pnpm build
# Creates optimized dist/ folder
```

### Deploy to Vercel
```bash
npm i -g vercel
vercel deploy
```

### Deploy to Other Platforms
- **Railway**: `vercel deploy`
- **Netlify**: Connect GitHub
- **Docker**: `docker build -t focusflow .`

---

## 🐛 Troubleshooting

### Port 3000 Already in Use
```bash
# Kill existing process
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9
# Or use different port
pnpm dev -- --port 3001
```

### Dependencies Not Installed
```bash
pnpm install
```

### TypeScript Errors
```bash
# Restart dev server
# Or check tsconfig.json
```

### Styling Not Showing
```bash
# Make sure Tailwind is imported
# Check src/globals.css
# Restart dev server
```

---

## 💡 Tips & Tricks

### Focus on Single Page
- Edit one page file (e.g., Dashboard.tsx)
- Changes hot-reload instantly
- Check browser DevTools for errors

### Use Browser DevTools
- Inspect component hierarchy
- Debug form inputs
- Check network requests (when connected to API)

### Test Responsive Design
- Chrome DevTools → Toggle device toolbar
- Test at 375px (mobile), 768px (tablet), 1920px (desktop)

### Check Accessibility
- Use Lighthouse audit in Chrome DevTools
- Check color contrast
- Test keyboard navigation (Tab key)

---

## 📝 File Sizes

| File | Lines | Size |
|------|-------|------|
| LandingPage.tsx | 284 | ~9 KB |
| Dashboard.tsx | 179 | ~6 KB |
| TaskManagement.tsx | 250 | ~8 KB |
| Calendar.tsx | 250 | ~8 KB |
| FocusTimer.tsx | 297 | ~9 KB |
| Settings.tsx | 302 | ~10 KB |
| mockData.ts | 284 | ~8 KB |
| globals.css | 141 | ~4 KB |
| **Total Source** | **2,655** | **~65 KB** |

---

## 🎓 Learning Path

1. **Start** - Explore landing page
2. **Navigate** - Use sidebar to visit each page
3. **Understand** - Read code in src/pages/
4. **Customize** - Edit colors in globals.css
5. **Extend** - Add new pages to router
6. **Integrate** - Follow API_INTEGRATION.md for backend

---

## 🎯 Next Steps

### Immediate
- [ ] Explore all pages
- [ ] Check mock data
- [ ] Customize colors

### Short Term
- [ ] Create NestJS backend
- [ ] Connect API endpoints
- [ ] Add real authentication

### Long Term
- [ ] Deploy to production
- [ ] Add user accounts
- [ ] Implement real features

---

## 📞 Need Help?

1. Check **README.md** for setup issues
2. Check **API_INTEGRATION.md** for backend questions
3. Look at **PROJECT_SUMMARY.md** for architecture
4. Review code comments in src files
5. Check browser console for errors

---

## ✨ Quick Reference

| Task | Command |
|------|---------|
| Start dev | `pnpm dev` |
| Build | `pnpm build` |
| Preview build | `pnpm preview` |
| Install deps | `pnpm install` |

---

**Status**: ✅ Ready to use  
**Port**: 3000  
**Environment**: Vite + React 19  
**Documentation**: 4 files included

**Happy coding! 🚀**
