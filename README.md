# React + Vite

## Run the application

From this directory, install dependencies in both projects:

```bash
npm install
npm --prefix backend install
```

Start the frontend and backend in separate terminals:

```bash
npm run dev
npm run backend:dev
```

The frontend runs at `http://localhost:5173` and the backend runs at `http://localhost:5000`.
The backend requires MongoDB at the `MONGO_URI` configured in `backend/.env`. Check `/api/health`; a `503` response with `"database":"unavailable"` means MongoDB is not reachable.

### Test Accounts (when MongoDB is unavailable)

When MongoDB is not reachable, the backend automatically falls back to an in-memory data layer with these demo accounts:

| Email | Password | Role |
|-------|----------|------|
| admin@demo.hr | admin123 | ADMIN |
| sarah.connor@company.com | password123 | ADMIN |
| evan.wright@company.com | password123 | HR_MANAGER |
| fiona.gallagher@company.com | password123 | HR_PAYROLL_MANAGER |
| alice.smith@company.com | password123 | EMPLOYEE |
| bob.jones@company.com | password123 | EMPLOYEE |

The in-memory store comes pre-seeded with employees, contracts, attendance records, leave requests, payroll runs, salary structures, and settings. Data resets when the backend restarts. To seed a real MongoDB instance instead, run `npm run backend:seed`.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
