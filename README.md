# Ethara — Project Management App

Full-stack project management with role-based access control.

## Stack
- **Backend**: Express + TypeScript + Prisma + SQLite + JWT
- **Frontend**: React + Vite + TypeScript + Tailwind CSS + React Query

## Quick Start

### Option A — Double-click scripts (easiest)
1. Double-click **`start-backend.bat`** → backend starts on port 3001
2. Double-click **`start-frontend.bat`** → frontend starts on port 5173
3. Open **http://localhost:5173**

### Option B — Terminal (if npm is not in PATH)
The project uses the Node.js bundled with Zed. Add it to your session PATH first:
```cmd
set PATH=C:\Users\Shaurya Narang\AppData\Local\Zed\node\node-v24.11.0-win-x64;%PATH%
```
Then in two separate terminals:
```cmd
cd backend && npm run dev
cd frontend && npm run dev
```

### Option C — Add Node to PATH permanently
1. Open **System Properties → Environment Variables**
2. Under **User variables**, edit `Path`
3. Add: `C:\Users\Shaurya Narang\AppData\Local\Zed\node\node-v24.11.0-win-x64`
4. Restart terminals — `npm` will work everywhere

## Features
- **Auth**: Signup / Login with JWT tokens (7-day expiry)
- **Projects**: Create, view, update, delete projects
- **Members**: Invite by email, assign ADMIN or MEMBER role, remove members
- **Tasks**: Create tasks with title, description, status, priority, due date, assignee
- **Board view**: Kanban-style columns (To Do / In Progress / Done)
- **List view**: Compact table with inline status change
- **Dashboard**: Stats overview — projects, tasks, my tasks, overdue count + recent/overdue task lists

## API Endpoints
```
POST   /api/auth/signup
POST   /api/auth/login
GET    /api/auth/me

GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PUT    /api/projects/:id          (ADMIN)
DELETE /api/projects/:id          (ADMIN)

GET    /api/projects/:id/members
POST   /api/projects/:id/members  (ADMIN)
PATCH  /api/projects/:id/members/:userId  (ADMIN)
DELETE /api/projects/:id/members/:userId  (ADMIN)

GET    /api/projects/:id/tasks
POST   /api/projects/:id/tasks
PUT    /api/projects/:id/tasks/:taskId
DELETE /api/projects/:id/tasks/:taskId    (ADMIN)

GET    /api/dashboard
```
