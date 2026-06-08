# CLAUDE.md

## Project
Personal Finance Tracker — React Native Mobile App
React Native + Expo + TypeScript

## Connects To
Spring Boot API: http://localhost:8080 (dev)
Production API: https://your-aws-url.com (prod)

## Architecture
Routing is **Expo Router** (file-based). Expo Router is built on React
Navigation, so Stack/Tabs concepts still apply — they're configured via files
and `_layout.tsx` instead of imperative navigators.

- app/ — routing layer ONLY. Route files are thin re-exports of src/screens.
  - app/_layout.tsx — AuthProvider + auth gate (Stack.Protected)
  - app/index.tsx — '/' entry, redirects to /dashboard or /login
  - app/(auth)/ — logged-out stack: login, register
  - app/(app)/ — logged-in Bottom Tabs: dashboard, transactions, budgets, alerts, profile
- src/screens/ — one file per screen (actual UI)
- src/components/ — reusable UI components
- src/services/ — API calls (axios) — the ONLY place that talks to the network
- src/hooks/ — custom React hooks (e.g. useAuth)
- src/context/ — global state (AuthContext)
- src/navigation/ — shared route path constants (structural nav config lives in app/_layout files)
- src/utils/ — helpers
- src/types/ — shared TypeScript interfaces

Path alias: `@/*` maps to the project root, so import as `@/src/...`.

## Rules
- TypeScript everywhere — no any types
- JWT stored in AsyncStorage
- All API calls go through services/ layer
- Never call axios directly from screens
- Handle loading and error states on every screen
- New screens: add the UI in src/screens, then a thin re-export route file in app/
- Auth is state-driven — change auth state via useAuth(), don't manually
  navigate between the auth and app stacks

## Current Status
- Navigation, auth gate, and tab placeholder screens are in place.
- Auth is wired to the real API (axios + AsyncStorage installed):
  - src/services/api.ts — shared axios client.
    - baseURL: EXPO_PUBLIC_API_URL (.env) > dev LAN auto-detect (Expo hostUri) > prod default.
    - request interceptor attaches the JWT.
    - response interceptor: 401 on a protected request -> clears session via a
      handler registered by AuthContext (setUnauthorizedHandler) -> nav falls back to login.
    - getApiErrorMessage(error, fallback) helper: extracts the API's { message }
      from an error body (e.g. 409/400) for user-facing messages.
  - src/services/authService.ts — POST /api/auth/login and /api/auth/register,
    with HTTP errors translated to user-friendly messages.
  - src/services/authStorage.ts — persists/restores { token, user } in AsyncStorage.
  - AuthContext: token, user, isAuthenticated, isLoading; login(email,password),
    register(email,password), logout; restores the saved session on startup.
  - Nav gate uses isAuthenticated; LoadingScreen shows while isLoading.
  - VERIFIED backend contract (probed against running server):
    success body is FLAT { token, userId, email } (normalized to { token, user });
    login bad password -> 403; register duplicate -> 409.
- Login/Register screens are real (validation, loading-disabled button, error
  states, keyboard handling) and use shared FormInput + PrimaryButton components.
- DASHBOARD built (src/screens/DashboardScreen.tsx): Net Worth, This Month
  (income/expenses/net), Budget Health (progress bars, green/amber/red), AI
  Spending Summary (skeleton while loading, "Insights unavailable" on error),
  and an unread-alerts badge. Each section is an independent component using
  useApi (data/loading/error) + useFocusEffect (refetch on tab focus).
  - Services: accountService, transactionService, budgetService, aiService,
    alertService. Reusable: components/{Card,ProgressBar,Skeleton}, hooks/useApi,
    utils/{dates,format,finance}.
  - VERIFIED dashboard shapes: accounts [{id,name,type,balance}]; transactions
    [{id,accountId,amount,type:INCOME|EXPENSE,category,description,date}] via
    ?startDate&endDate; budgets [{id,category,limitAmount,spentAmount,month,year}];
    ai {summary}.
  - KNOWN BACKEND BUGS: GET /api/budgets/status and GET /api/alerts/count return
    500 (even with data). Services fall back to GET /api/budgets and
    GET /api/alerts respectively (marked FIXME(backend)); remove once fixed.
- ACCOUNTS built (src/screens/AccountsScreen.tsx) + new "Accounts" bottom tab
  (app/(app)/accounts.tsx, between Dashboard and Transactions):
  - FlatList of account cards (name, type, balance colored green/red), net-worth
    header with Add button, pull-to-refresh (RefreshControl), refetch on focus.
  - AccountFormModal (src/components/AccountFormModal.tsx) for add/edit: name
    input, type segmented picker (CHECKING/SAVINGS/CREDIT/CASH), balance input;
    Save -> POST/PUT; Delete -> Alert.alert confirm -> DELETE.
  - accountService.create/update/delete added.
  - VERIFIED account write behavior: POST {name,type} -> 201 but balance is
    IGNORED (created at 0; server-managed). DELETE -> 204 (works).
    KNOWN BACKEND BUGS: PUT /api/accounts/{id} returns 500 (edit broken
    server-side); initial balance cannot be set on create. UI is built correctly
    and surfaces the error; will work once the backend is fixed.
- TRANSACTIONS built (src/screens/TransactionsScreen.tsx):
  - SectionList grouped by date (rows: category icon, description, category,
    amount colored +green/-red); filter bar (date range via DateField, type
    SegmentedControl ALL/INCOME/EXPENSE, category chips); FAB opens
    TransactionFormSheet (account picker, amount numeric, type toggle,
    description, category with debounced AI auto-suggest via POST
    /api/ai/categorize -> {category}, date picker) -> POST /api/transactions;
    swipe-to-delete -> DELETE /api/transactions/{id}.
  - SWIPE: implemented with core RN PanResponder + Animated
    (src/components/SwipeableRow.tsx), NOT react-native-gesture-handler.
    gesture-handler v3 (the SDK 56 version) crashes in Expo Go at
    installUIRuntimeBindings; PanResponder has no native/worklet deps and works
    everywhere. babel.config.js (babel-preset-expo) was also added.
  - Installed: @react-native-community/datetimepicker. Reusable:
    components/{SegmentedControl,DateField,TransactionFormSheet}, utils/
    {categoryIcon,transactions}, dates.{toISODateString,fromISODateString,formatDateHeading}.
  - VERIFIED: POST /api/ai/categorize {description} -> {category} (free-form
    string); DELETE /api/transactions/{id} -> 204.
  - NOTE: GET /api/transactions only filters by date range server-side (type &
    category params are IGNORED) -> type/category filtering is done client-side.
    GET /api/categories returns 500 -> category list derived from loaded txns.
- BUDGETS built (src/screens/BudgetsScreen.tsx):
  - Monthly selector (prev/next) -> GET /api/budgets?month&year (filters
    server-side); budget cards with ProgressBar colored by budgetLevel
    (green <70%, amber 70-100%, red >100% — threshold updated from 80 to 70),
    "$spent of $limit" and % used; Add budget sheet (BudgetFormSheet:
    category + monthly limit) -> POST /api/budgets {category,limitAmount,month,year};
    pull-to-refresh; AI Budget Advice card (GET /api/ai/budget-advice ->
    {advice} MARKDOWN, rendered by src/components/MarkdownText.tsx) with a
    refresh button.
  - budgetService is now getBudgets(month?,year?) + createBudget (dashboard
    updated to call getBudgets). aiService.getBudgetAdvice added.
    BUDGET_LEVEL_COLOR moved into utils/finance.
  - NOTE: GET /api/budgets/status is now per-category (requires ?category=,
    returns {budget, percentUsed}); the LIST uses GET /api/budgets and computes
    % client-side. (The old 500 on /status is gone.)
- Remaining tab screen (Alerts) is still a placeholder.

## API Base URL
Dev: auto-detected LAN host (so physical devices reach the local server)
Override / Prod: EXPO_PUBLIC_API_URL in .env (see .env.example)
