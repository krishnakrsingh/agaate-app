# Farm Admin Experience Overhaul — Zero Bloat & High-Leverage Workflows

We completely removed the bloated, fragmented overview and stub pages and rebuilt a focused, simple, and high-leverage application architecture for **Farm Admins (Estate Clients)** who manage multiple farms, multiple demarcated plots, crop cycles, operations, and direct agronomy communications.

---

## 1. Eliminated Redundant / Useless Pages

All cluttered, duplicate, or fragmented sub-pages have been removed from the navigation and automatically redirect to their primary, feature-rich consoles:

| Obsolete Route | Action | Canonical Destination | Benefit |
| :--- | :--- | :--- | :--- |
| `/owner/dashboard` | **REMOVED** &rarr; 307 Redirect | `/owner/farms` | Eliminated the useless overview page. Client lands directly on their actual farm portfolio. |
| `/dashboard` & `/` | Redirect | `/owner/farms` | Farm Admin logs in directly to their farm portfolio. |
| `/owner/farm` | Redirect | `/owner/farms` | Replaced single-farm stub with multi-farm portfolio directory. |
| `/owner/land` | Redirect | `/owner/plots` | Replaced legacy land explorer with full cadastral demarcation map. |
| `/owner/calendar` | Redirect | `/owner/operations` | Consolidated standalone calendar into operations toggle. |
| `/owner/harvest` | Redirect | `/owner/records` | Unified into tabbed records console. |
| `/owner/inventory` | Redirect | `/owner/records` | Unified into tabbed records console. |
| `/owner/financials`| Redirect | `/owner/records` | Unified into tabbed records console. |
| `/owner/team` | Redirect | `/owner/people` | Consolidated team directory. |

---

## 2. The 6 Core, Purpose-Built Farm Admin Pages

### 🏡 1. Farm Estates Portfolio (`/owner/farms`)
- **Multi-Estate Management**: Full portfolio directory of all farms owned by the client with acreage rollup, active plots count, and live status pills.
- **Zero-Scroll Onboarding Wizard** (`FarmCreateWizard`):
  - 4 compact screens with **Next / Back** buttons and zero vertical window scrolling:
    1. *Identity & Location* &rarr; 2. *Land & Area Metrics* &rarr; 3. *Water & Power Infrastructure* &rarr; 4. *Coordinates & Review*.

### 🗺️ 2. Plots & Cadastral Demarcation (`/owner/plots`)
- **Multi-Polygon Satellite Demarcation Map** (`FarmDemarcationMap`):
  - Automatically draws parent farm perimeter (dashed boundary) and all child plots as distinct, colored, non-overlapping polygons.
  - Interactive hover tooltips showing plot area, active crop, variety, and irrigation infrastructure.
  - Base layer switcher (High-res Satellite Imagery vs Street Map).
- **Plot Demarcation Wizard** (`PlotDemarcateWizard`):
  - 4-step zero-scroll dialog allowing clients to define boundaries, soil type, and irrigation lateral types.

### 🌱 3. Crop Cycles & Production Management (`/owner/crops`)
- **Multi-Farm Filter**: Filter crop cycles across all client farms or focus on a specific estate.
- **Stage Progression Track**: Visual development milestones (*Land Prep &rarr; Sowing/TP &rarr; Vegetative &rarr; Flowering &rarr; Harvest*) with completed/in-progress indicators.
- **Demarcation Satellite Preview**: Clicking *"View Demarcation Map"* on any crop cycle opens an instant popup showing that specific plot's demarcated boundary on satellite imagery.
- **Zero-Scroll Launch Wizard** (`CropCycleWizard`):
  - 4 compact screens: *Crop & Variety &rarr; Agronomy Method & Bed Prep &rarr; Milestone Dates &rarr; Review & Launch*.

### 💬 4. Real-Time Advisory & Team Chat (`/owner/chat`)
- **Specialist Roster**: Direct one-click access to assigned Agronomists (e.g. Dr. Ananya Rao) and Lead Field Officers for each estate.
- **Context-Linked Threads**: Consultations tagged with specific plots and crop cycles.
- **Zero-Scroll Layout**: Modern fixed-height interface with photo upload zone and real-time polling.

### 📋 5. Operations & Execution (`/owner/operations`)
- **View Switcher**: Instant toggle between:
  - **Activity Queue**: Filter by priority, status, plot with bulk dispatch controls.
  - **Ops Calendar**: Monthly calendar with color-coded markers for tasks, incidents, and harvests.
- **Zero-Scroll Activity Scheduler**: Modal dialog allowing fast activity scheduling without leaving the page.

### 📦 6. Commercial Records Console (`/owner/records`)
- Unified tabbed console:
  1. **Harvest Logistics**: Quantities, produce grades, dispatch receipts.
  2. **Shed Inventory**: Seed bags, fertilizers, crop protection chemicals, equipment.
  3. **Expenses & Ledger**: Farm-level expenditures, categories, cost per acre.

---

## 3. Sidebar Navigation Streamlined

The sidebar for `FARM_ADMIN` now contains exclusively the 7 essential tools:

```
PORTFOLIO & LAND
  • Farm Estates          (/owner/farms)
  • Plots & Demarcation   (/owner/plots)
  • Crop Cycles           (/owner/crops)

OPERATIONS & COMMS
  • Operations & Tasks    (/owner/operations)
  • Agronomy & Team Chat  (/owner/chat)
  • Commercial Records    (/owner/records)

ACCOUNT
  • Estate Settings       (/owner/settings)
```

---

## 4. Automated Verification Results

All routes verified live against the local Next.js server with authenticated Farm Admin session:

```bash
/owner/dashboard     -> 307 /owner/farms   (Useless overview removed)
/dashboard           -> 307 /owner/farms
/                    -> 307 /owner/farms
/owner/farm          -> 307 /owner/farms
/owner/farms         -> 200 OK
/owner/land          -> 307 /owner/plots
/owner/plots         -> 200 OK
/owner/crops         -> 200 OK
/owner/calendar      -> 307 /owner/operations
/owner/operations    -> 200 OK
/owner/chat          -> 200 OK
/owner/harvest       -> 307 /owner/records
/owner/inventory     -> 307 /owner/records
/owner/financials    -> 307 /owner/records
/owner/records       -> 200 OK
```

- **TypeScript Compilation**: `npx tsc --noEmit` &rarr; 0 errors.
- **Design Guard Rules**: All new components strictly follow tokenized palette rules (`var(--green-tint)`, `var(--green-ink)`, `var(--amber)`, `var(--red)`, `var(--hairline)`).
