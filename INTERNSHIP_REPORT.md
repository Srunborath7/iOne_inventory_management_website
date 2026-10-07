# INTERNSHIP WEEKLY PROGRESS REPORT

**Intern Name:** Srun Borath  
**Company / Organization:** iOne  
**Department:** Software Development & Engineering  
**Project:** Stockwise — Inventory Management Web Application  
**Reporting Period:** October 1, 2026 – October 7, 2026  
**Tech Stack:** Next.js 16 (Turbopack, App Router), React 19, TypeScript, Tailwind CSS, Python FastAPI  

---

## 1. Executive Summary

During the first week of the internship, the primary focus was onboarding into the development environment, initializing the full-stack architecture, and building a responsive, feature-rich web application for inventory and catalog management. 

By the end of this reporting period, the project achieved:
- A configured **macOS** development environment with **FastAPI** backend integration.
- A **Next.js 16 / React 19** application with route protection, session management, and state management.
- Complete **CRUD operations** for product categories, including multipart image uploads, live search, sorting, and Grid/Table view toggles.
- An interactive **Analytics Dashboard** featuring dynamic KPIs and responsive SVG charts.
- A **modern, accessible SaaS UI/UX** with glassmorphism, toast notifications, and dark-accented authentication.

---

## 2. Daily Activity & Timeline

| Date | Day | Tasks & Accomplishments | Status |
| :--- | :--- | :--- | :--- |
| **01 Oct 2026** | Thursday | Environment setup on macOS; installed and configured Python, FastAPI, and Uvicorn; explored OpenAPI Swagger docs (`/docs`). | Completed |
| **02 Oct 2026** | Friday | Initialized Next.js project with TypeScript and Tailwind CSS; configured directory layout (`app`, `components`, `services`, `lib`, `store`). | Completed |
| **05 Oct 2026** | Monday | Designed HTTP API client; implemented JWT cookie storage; built route protection proxy (`proxy.ts`); created global Zustand-style store. | Completed |
| **06 Oct 2026** | Tuesday | Built base layout shell (NavBar, SideBar); integrated initial category listing endpoint; designed initial authentication views. | Completed |
| **07 Oct 2026** | Wednesday | Overhauled UI/UX design system; implemented full Category CRUD with image uploads; created interactive Dashboard analytics; added global Toast alerts. | Completed |

---

## 3. Detailed Work Breakdown

### October 1, 2026 — Development Setup & Backend Initialization
- **macOS Onboarding**: Familiarized with terminal workflows, package managers (`brew`, `pip`, `npm`), and developer tooling.
- **FastAPI Backend Setup**:
  - Configured local API server running on `http://localhost:8000/api/v1`.
  - Reviewed OpenAPI 3.1 specification for Authentication (`/auth/register`, `/auth/login`, `/auth/me`) and Category models (`/categories`).
  - Tested API request payloads and validation rules using Swagger UI and curl.

### October 2, 2026 — Frontend Project Initialization
- **Next.js 16 Setup**:
  - Initialized project `inventory_management_website` with App Router, Turbopack, and TypeScript 5.
  - Configured `@/*` alias path mappings in `tsconfig.json`.
  - Added environment configuration in `.env` (`NEXT_PUBLIC_API_BASE_URL`).
  - Established modular directory architecture separating services, state, UI components, and routes.

### October 5, 2026 — Architecture, Network Layer & Authentication Flow
- **HTTP Client Architecture (`src/services/http/client.ts`)**:
  - Implemented centralized fetch wrapper with automatic `Authorization: Bearer <token>` injection.
  - Added support for both JSON and multipart `FormData` payloads.
  - Handled HTTP 204 (No Content) responses and FastAPI validation error structures (`{ detail }`).
- **Session & Storage Management (`src/lib/session.ts` & `src/store/useAppStore.ts`)**:
  - Stored access tokens in secure `SameSite=Lax` cookies for server-side proxy verification.
  - Synchronized authenticated user profile (`id`, `full_name`, `email`) in localStorage and memory.
- **Route Protection (`src/proxy.ts`)**:
  - Implemented Next.js 16 proxy convention to protect `/dashboard` and `/categories` routes against unauthenticated access.

### October 6, 2026 — Shell Architecture & Category Integration
- **Layout Foundation (`src/components/dashboardShell.tsx`)**:
  - Built responsive shell structure containing sticky sidebar, navigation bar, and main content canvas.
- **Initial Categories Service (`src/services/categories/`)**:
  - Created TypeScript data interfaces for Category entities.
  - Implemented initial read query to list catalog items from backend.

### October 7, 2026 — Comprehensive UI/UX Overhaul & Full Feature Set
- **Design System & Visual Overhaul (`src/app/globals.css`)**:
  - Replaced legacy Arial styling with clean Geist typography.
  - Implemented modern SaaS aesthetic: deep slate surfaces, vibrant emerald accents (`#059669`), frosted glass panels, and subtle micro-elevations (`card-hover-lift`).
- **Category Management Hub (`src/app/(dashboard)/categories/page.tsx`)**:
  - **Create & Edit Modal**: Built `CategoryFormModal` with validation, character limits, and drag-and-drop image uploads with live preview.
  - **Delete Modal**: Created `CategoryDeleteModal` with clear safety confirmations.
  - **Details Inspector**: Created `CategoryDetailModal` showcasing full-resolution product images, catalog IDs, and timestamps.
  - **View Modes**: Added **Grid View** (visual product cards) and **Table View** (structured data grid) toggle.
  - **Live Search & Sorting**: Real-time filtering by category name/description and sorting (Newest, Oldest, A–Z).
  - **Backend Static Images**: Integrated `getCategoryImageUrl` to display uploaded media from FastAPI (`/uploads/...`).
- **Interactive Analytics Dashboard (`src/app/(dashboard)/dashboard/page.tsx`)**:
  - **Dynamic KPIs**: Connected real-time category counters, SKU estimates, and stock turnover metrics.
  - **Interactive Stock Movement Chart**: Interactive SVG curve with reactive time filters (`7D`, `30D`, `90D`) and hover data-point tooltips.
  - **Inventory Health Distribution**: Visual conic donut chart showing stock ratios (In Stock, Low Stock, Depleted).
  - **Quick Action Trigger**: Direct modal launcher allowing category creation from the overview screen.
- **Navigation & Global Feedback**:
  - **Header (`src/components/navBar.tsx`)**: Quick catalog search, notifications dropdown, and authenticated user dropdown.
  - **Sidebar (`src/components/sideBar.tsx`)**: Active route pill badges, mobile slide-out drawer, and logout handler.
  - **Toast Notifications (`src/components/toast/ToastContext.tsx`)**: Global lightweight toast alerts for instant user feedback.
- **Auth Enhancements (`src/app/auth/`)**:
  - Modern split-screen layout with ambient lighting.
  - Password visibility toggle (eye/eye-off) and 1-click **Autofill Demo Credentials** button.
- **Production Readiness**:
  - Verified and passed zero-error builds with `npm run lint` and `npm run build` under Next.js 16 Turbopack and React 19.

---

## 4. Technical Challenges & Solutions

1. **FastAPI Error & Multipart Boundary Handling**:
   - *Challenge*: FastAPI sends errors using `{ detail: "..." }` or `{ detail: [{ msg: "..." }] }`, and standard JSON fetch headers broke binary image file uploads.
   - *Solution*: Upgraded `httpClient` to detect `FormData` instances (omitting manual `Content-Type` headers so the browser sets proper multipart boundaries) and added intelligent parsing for FastAPI `detail` messages.

2. **Next.js 16 Turbopack SSR Prerender Evaluation**:
   - *Challenge*: Turbopack flagged `new Date()` evaluated during build prerendering in client components.
   - *Solution*: Safely deferred time calculations to `useEffect` hooks, preventing hydration mismatches and enabling clean static build generation.

3. **React 19 Linting & Cascading Renders**:
   - *Challenge*: React 19 compiler flagged synchronous `setState` calls inside effect hooks.
   - *Solution*: Refactored modals using keyed dialog instances (`key={id ?? 'new'}`) to initialize local form state cleanly upon mount.

---

## 5. Skills & Competencies Acquired

- **Next.js 16 (App Router & Turbopack)**: Dynamic routing, client components, static pre-rendering, and proxy middleware.
- **Modern React (v19)**: Custom hooks, Context API, state modeling, and transition hooks (`useTransition`).
- **RESTful API Integration**: Connecting frontend client interfaces with Python FastAPI backends.
- **Modern CSS & UX Architecture**: Tailwind CSS design tokens, responsive breakpoints, glassmorphism, micro-animations, and accessibility.
- **Software Quality**: Strict TypeScript typings, zero-warning ESLint conformance, and production bundle optimization.

---

## 6. Next Steps & Upcoming Objectives

1. Develop Product Management interface (SKU, price, quantity, category assignment).
2. Implement low-stock alert notifications and replenishment triggers.
3. Add CSV export and printable summary reports for catalog data.
4. Expand user roles and permissions (Admin vs. Inventory Staff).

---

**Report Prepared By:** Srun Borath  
**Date:** October 7, 2026  
**Status:** Approved for Weekly Submission
