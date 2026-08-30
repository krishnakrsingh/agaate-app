# Agaate Farm Management PWA — Design Brief


<!-- cortex:toc -->
- [1. Design Philosophy](#1-design-philosophy)
  - [1.1 Core Principles](#11-core-principles)
  - [1.2 Design Tone](#12-design-tone)
- [2. Brand Identity](#2-brand-identity)
  - [2.1 Color Palette](#21-color-palette)
  - [2.2 Typography](#22-typography)
  - [2.3 Spacing System](#23-spacing-system)
- [3. Layout System](#3-layout-system)
  - [3.1 Shell Layout](#31-shell-layout)
  - [3.2 Responsive Breakpoints](#32-responsive-breakpoints)
  - [3.3 Navigation](#33-navigation)
- [4. Component Library](#4-component-library)
  - [4.1 Core Components](#41-core-components)
    - [Cards](#cards)
    - [Buttons](#buttons)
    - [Form Inputs](#form-inputs)
    - [Status Badges](#status-badges)
    - [Toast Notifications](#toast-notifications)
  - [4.2 Data Display](#42-data-display)
    - [Metric Cards (Dashboard)](#metric-cards-dashboard)
    - [Tables](#tables)
    - [Empty States](#empty-states)
- [5. Screen-by-Screen Design Specifications](#5-screen-by-screen-design-specifications)
  - [5.1 Login Page](#51-login-page)
  - [5.2 Dashboard](#52-dashboard)
  - [5.3 Farm Hub (Farm Detail Page)](#53-farm-hub-farm-detail-page)
  - [5.4 Farm Officer "My Day" Screen](#54-farm-officer-my-day-screen)
  - [5.5 Task Board](#55-task-board)
  - [5.6 Crop Cycle Creation Wizard](#56-crop-cycle-creation-wizard)
  - [5.7 Approval Console](#57-approval-console)
- [6. Interaction Patterns](#6-interaction-patterns)
  - [6.1 Loading States](#61-loading-states)
  - [6.2 Confirmation Dialogs](#62-confirmation-dialogs)
  - [6.3 Form Patterns](#63-form-patterns)
  - [6.4 Photo Upload](#64-photo-upload)
- [7. PWA Considerations](#7-pwa-considerations)
  - [7.1 Manifest](#71-manifest)
  - [7.2 Mobile Optimizations](#72-mobile-optimizations)
  - [7.3 Offline Behavior](#73-offline-behavior)
- [8. Accessibility](#8-accessibility)
- [9. Icon System](#9-icon-system)
<!-- cortex:toc:end -->

**Version:** 1.0  
**Date:** 2026-08-30

---

## 1. Design Philosophy

### 1.1 Core Principles

| Principle | Application |
|---|---|
| **Field-First** | Designed for Farm Officers working outdoors with varying connectivity and lighting conditions |
| **Role-Optimized** | Each role gets a purpose-built interface — not one generic dashboard for all |
| **Action-Oriented** | Every screen should answer: "What should I do next?" |
| **Data-Dense for Admins** | Agronomists and Admins need overview + drill-down, not simplified cards |
| **Simple for Officers** | Farm Officers get a linear, step-by-step flow with minimal decisions |

### 1.2 Design Tone

- **Professional** — enterprise agricultural management, not consumer social
- **Functional** — clarity over decoration; every visual element earns its space
- **Trustworthy** — consistent patterns, predictable interactions
- **Efficient** — minimize taps and scrolling for field users

---

## 2. Brand Identity

### 2.1 Color Palette

| Token | Value | Usage |
|---|---|---|
| **Primary** | `#064e3b` (Emerald 900) | Navbar, headers, primary actions |
| **Primary Light** | `#10b981` (Emerald 500) | Active states, success indicators |
| **Surface** | `#f8fafc` (Slate 50) | Page background |
| **Card** | `#ffffff` | Card backgrounds |
| **Text Primary** | `#1e293b` (Slate 800) | Headings, body text |
| **Text Secondary** | `#64748b` (Slate 500) | Labels, secondary info |
| **Border** | `#e2e8f0` (Slate 200) | Card borders, dividers |
| **Danger** | `#dc2626` (Red 600) | Errors, destructive actions |
| **Warning** | `#f59e0b` (Amber 500) | Warnings, pending states |
| **Info** | `#3b82f6` (Blue 500) | Informational elements |

### 2.2 Typography

| Element | Specification |
|---|---|
| **Font Family** | System font stack (no external font loading) |
| **Base Size** | 16px (1rem) |
| **Headings** | Bold, 1.5rem–2rem, slate-800 |
| **Body** | Regular, 1rem, slate-700 |
| **Labels** | Medium, 0.875rem, slate-500 |
| **Monospace** | System monospace (for data values) |

### 2.3 Spacing System

| Token | Value | Usage |
|---|---|---|
| `xs` | 4px | Tight inline spacing |
| `sm` | 8px | Between related elements |
| `md` | 16px | Section padding |
| `lg` | 24px | Card padding |
| `xl` | 32px | Section gaps |
| `2xl` | 48px | Page-level spacing |

---

## 3. Layout System

### 3.1 Shell Layout

```
┌──────────────────────────────────────────┐
│  NAVBAR (sticky top)                      │
│  Logo  |  Nav Links  |  User Menu        │
├──────────────────────────────────────────┤
│                                          │
│  MAIN CONTENT (.shell)                   │
│  max-width: 1200px                       │
│  padding: 24px                           │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  Page Header                       │  │
│  │  Title + Breadcrumbs + Actions     │  │
│  ├────────────────────────────────────┤  │
│  │                                    │  │
│  │  Content Area                      │  │
│  │  (Cards, Forms, Tables, Lists)     │  │
│  │                                    │  │
│  └────────────────────────────────────┘  │
│                                          │
└──────────────────────────────────────────┘
```

### 3.2 Responsive Breakpoints

| Breakpoint | Width | Layout |
|---|---|---|
| **Mobile** | < 640px | Single column, stacked cards |
| **Tablet** | 640–1024px | 2-column grid where applicable |
| **Desktop** | > 1024px | Full layout, side-by-side panels |

### 3.3 Navigation

**Navbar (all roles):**
- Logo/app name (left)
- Role-specific nav links (center)
- User name + logout (right)
- Mobile: hamburger menu with slide-out nav

**Role-Specific Nav Items:**

| Role | Nav Items |
|---|---|
| Super Admin | Dashboard, Farms, Tasks, Reports, Users, Approvals |
| Farm Admin | Dashboard, Farms, Tasks, Reports, Approvals |
| Agronomist | Dashboard, Tasks, Reports |
| Farm Officer | My Day, Reports |

---

## 4. Component Library

### 4.1 Core Components

#### Cards
- White background with subtle border (`1px solid #e2e8f0`)
- Border radius: 12px
- Padding: 24px
- Subtle shadow on hover for interactive cards
- Status indicator stripe (left border color) for state-aware cards

#### Buttons

| Variant | Style | Usage |
|---|---|---|
| **Primary** | Filled emerald-900, white text | Primary actions (Save, Submit, Create) |
| **Secondary** | Outlined, emerald border | Secondary actions (Cancel, Back) |
| **Danger** | Filled red-600, white text | Destructive actions (Delete, Reject) |
| **Ghost** | No border/fill, text only | Tertiary actions (links, filters) |
| **Icon** | Square, icon only | Compact actions (edit, delete, menu) |

All buttons: `border-radius: 8px`, `padding: 10px 20px`, `font-weight: 600`

#### Form Inputs
- Full-width by default
- Label above input (medium weight, slate-500)
- Input: 1px border, 8px radius, 12px padding
- Focus state: emerald-500 border + subtle glow
- Error state: red-600 border + error message below
- Required indicator: red asterisk after label

#### Status Badges

| Status | Color | Example |
|---|---|---|
| Active / Good | Green bg + text | Farm Active, Crop Good |
| Setup / Planned | Blue bg + text | Farm Setup, Cycle Planned |
| Pending | Amber bg + text | Exception Pending, Task Assigned |
| Completed | Gray bg + text | Task Completed, Cycle Completed |
| Error / Poor | Red bg + text | Crop Poor, Exception Rejected |
| Blocked | Orange bg + text | Task Blocked |

#### Toast Notifications
- Position: top-right, stacked
- Auto-dismiss after 5 seconds
- Variants: success (green), error (red), info (blue), warning (amber)

### 4.2 Data Display

#### Metric Cards (Dashboard)
```
┌─────────────────────────┐
│  📊 Label               │
│  42                     │  ← Large number
│  ▲ 12% from last week   │  ← Optional trend
└─────────────────────────┘
```

#### Tables
- Sticky header
- Alternating row backgrounds (subtle)
- Hover highlight
- Responsive: horizontal scroll on mobile
- Sortable column headers

#### Empty States
- Centered illustration/icon
- Clear message: "No farms created yet"
- CTA button: "Create Your First Farm"

---

## 5. Screen-by-Screen Design Specifications

### 5.1 Login Page

```
┌──────────────────────────────┐
│                              │
│      🌾 Agaate               │
│      Farm Management         │
│                              │
│  ┌────────────────────────┐  │
│  │ Email                  │  │
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │ Password               │  │
│  └────────────────────────┘  │
│                              │
│  [       Sign In          ]  │
│                              │
└──────────────────────────────┘
```
- Centered card on emerald gradient background
- No registration — admin-created accounts only
- Error messages inline below fields

### 5.2 Dashboard

**Layout:** Metric cards row (top) → Farm cards grid (below)

- Metrics: Total Farms, Active Farms, Active Plots, Total Tasks, Delayed, Incidents
- Farm Cards: Name, location, status badge, owner, plot count, area
- Quick actions per farm card: View, Edit (role-dependent)
- Search/filter bar for farms

### 5.3 Farm Hub (Farm Detail Page)

**Sections (tabbed or scrollable):**
1. **Overview** — Farm details, status, location map placeholder
2. **Plots** — Grid of plot cards with crop cycle indicators
3. **Team** — Assigned users with roles
4. **Activity** — Recent task activity feed

**Actions:** Edit Farm, Add Plot, Manage Access, Activate Farm

### 5.4 Farm Officer "My Day" Screen

**Mobile-optimized, linear layout:**

```
┌──────────────────────────────┐
│  Good Morning, Ramesh 👋      │
│  Farm: Sunrise Agri          │
│  Date: 30 Aug 2026           │
├──────────────────────────────┤
│                              │
│  [ 📸 START DAY ]            │  ← Big, tappable button
│                              │
├──────────────────────────────┤
│  TODAY'S TASKS (5)           │
│  ┌──────────────────────┐    │
│  │ 🟢 Fertigation       │    │
│  │ Plot 2 - Tomato      │    │
│  │ Priority: HIGH       │    │
│  └──────────────────────┘    │
│  ┌──────────────────────┐    │
│  │ 🔵 Crop Monitoring   │    │
│  │ Plot 1 - Watermelon  │    │
│  └──────────────────────┘    │
├──────────────────────────────┤
│  CROP HEALTH UPDATE          │
│  ┌──────────────────────┐    │
│  │ Upload Crop Photo     │    │
│  │ [Good] [Poor]         │    │
│  └──────────────────────┘    │
├──────────────────────────────┤
│  [⚠️ REPORT INCIDENT]        │
├──────────────────────────────┤
│  [ 📸 END DAY ]              │
└──────────────────────────────┘
```

### 5.5 Task Board

**Layout:** Filterable table/list view

- Filters: Farm, Status, Priority, Date Range, Assigned Officer
- Columns: Title, Farm/Plot, Category, Priority, Due Date, Status, Assigned To
- Click row → Task Detail view
- Bulk actions for Agronomist/Admin

### 5.6 Crop Cycle Creation Wizard

**Multi-step form:**

```
Step 1          Step 2          Step 3          Step 4
[Basic Info] → [Varieties] → [Infrastructure] → [Review]
                                                  ↓
                                              [Save]
```

Each step validates before proceeding. Progress indicator at top. Back/Next navigation.

### 5.7 Approval Console

**Split view:**
- Left: List of pending approvals (exceptions + location changes)
- Right: Detail view with evidence (location, reason, distance)
- Actions: Approve / Reject with visual confirmation

---

## 6. Interaction Patterns

### 6.1 Loading States
- Skeleton screens for page loads (not spinners)
- Button loading: text changes to "Saving..." + disabled state
- Inline loading for async data fetches

### 6.2 Confirmation Dialogs
- Used for: destructive actions, status changes, approvals
- Modal overlay with clear action buttons
- Never use browser `confirm()` dialogs

### 6.3 Form Patterns
- Inline validation on blur
- Server validation on submit
- Disable submit button until required fields filled
- Auto-save not implemented (explicit save only)

### 6.4 Photo Upload
- Camera capture (preferred on mobile) or file selection
- Preview before upload
- Progress indicator during upload
- Presigned URL → direct to S3 (no server relay)

---

## 7. PWA Considerations

### 7.1 Manifest
- App name: "Agaate Farm Operations"
- Theme color: `#064e3b`
- Display: standalone
- Installable on Android/iOS home screen

### 7.2 Mobile Optimizations
- Touch targets: minimum 44×44px
- No hover-dependent interactions
- Large, thumb-friendly action buttons
- Bottom-sheet modals instead of dropdowns on mobile

### 7.3 Offline Behavior
- Service worker registered for basic asset caching
- Graceful error messages when offline: "You're offline. Please reconnect."
- No offline data queue (MVP limitation)

---

## 8. Accessibility

| Requirement | Implementation |
|---|---|
| Color contrast | WCAG AA minimum (4.5:1 for text) |
| Keyboard navigation | All interactive elements focusable |
| Screen readers | Semantic HTML, ARIA labels where needed |
| Focus indicators | Visible focus rings on keyboard navigation |
| Form labels | All inputs have associated `<label>` elements |
| Error messages | Associated with inputs via `aria-describedby` |

---

## 9. Icon System

Custom SVG icons defined in `icons.tsx` — no external icon library dependency.

**Icon Categories:**
- Navigation (home, farms, tasks, reports, users)
- Actions (add, edit, delete, save, upload, camera)
- Status (check, warning, error, info, clock)
- Domain (plant, sun, water, weather, location)

All icons: 24×24 default size, `currentColor` fill, configurable via props.
