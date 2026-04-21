my-dashboard-app/
├─ public/
│ ├─ favicon.ico
│ └─ images/
│
├─ src/
│ ├─ app/
│ │ ├─ App.tsx
│ │ ├─ main.tsx
│ │ ├─ router.tsx
│ │ └─ providers/
│ │ ├─ ThemeProvider.tsx
│ │ ├─ QueryProvider.tsx
│ │ └─ AuthProvider.tsx
│ │
│ ├─ assets/
│ │ ├─ icons/
│ │ └─ styles/
│ │ ├─ globals.css
│ │ ├─ reset.css
│ │ └─ variables.css
│ │
│ ├─ components/
│ │ ├─ ui/
│ │ │ ├─ Button/
│ │ │ │ ├─ Button.tsx
│ │ │ │ ├─ Button.module.css
│ │ │ │ └─ index.ts
│ │ │ ├─ Card/
│ │ │ ├─ Modal/
│ │ │ ├─ Table/
│ │ │ └─ Input/
│ │ │
│ │ ├─ layout/
│ │ │ ├─ Header/
│ │ │ ├─ Sidebar/
│ │ │ ├─ Footer/
│ │ │ └─ DashboardLayout/
│ │ │
│ │ └─ common/
│ │ ├─ Loading/
│ │ ├─ EmptyState/
│ │ └─ ErrorMessage/
│ │
│ ├─ features/
│ │ ├─ auth/
│ │ │ ├─ api/
│ │ │ ├─ components/
│ │ │ ├─ hooks/
│ │ │ ├─ types/
│ │ │ └─ utils/
│ │ │
│ │ ├─ dashboard/
│ │ │ ├─ api/
│ │ │ ├─ components/
│ │ │ ├─ hooks/
│ │ │ ├─ types/
│ │ │ └─ utils/
│ │ │
│ │ ├─ users/
│ │ │ ├─ api/
│ │ │ ├─ components/
│ │ │ ├─ hooks/
│ │ │ ├─ types/
│ │ │ └─ utils/
│ │ │
│ │ └─ reports/
│ │ ├─ api/
│ │ ├─ components/
│ │ ├─ hooks/
│ │ ├─ types/
│ │ └─ utils/
│ │
│ ├─ pages/
│ │ ├─ LoginPage/
│ │ │ └─ LoginPage.tsx
│ │ ├─ DashboardPage/
│ │ │ └─ DashboardPage.tsx
│ │ ├─ UsersPage/
│ │ │ └─ UsersPage.tsx
│ │ ├─ ReportsPage/
│ │ │ └─ ReportsPage.tsx
│ │ └─ NotFoundPage/
│ │ └─ NotFoundPage.tsx
│ │
│ ├─ services/
│ │ ├─ apiClient.ts
│ │ ├─ authService.ts
│ │ └─ storageService.ts
│ │
│ ├─ hooks/
│ │ ├─ useDebounce.ts
│ │ ├─ useModal.ts
│ │ └─ usePagination.ts
│ │
│ ├─ store/
│ │ ├─ index.ts
│ │ ├─ authStore.ts
│ │ └─ uiStore.ts
│ │
│ ├─ types/
│ │ ├─ api.ts
│ │ ├─ auth.ts
│ │ └─ common.ts
│ │
│ ├─ utils/
│ │ ├─ formatDate.ts
│ │ ├─ formatCurrency.ts
│ │ ├─ constants.ts
│ │ └─ helpers.ts
│ │
│ └─ config/
│ ├─ env.ts
│ ├─ menu.ts
│ └─ chart.ts
│
├─ .env
├─ .env.development
├─ .env.production
├─ index.html
├─ package.json
├─ tsconfig.json
└─ vite.config.ts
