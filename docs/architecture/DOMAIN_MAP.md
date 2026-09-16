# DOMAIN_MAP — derived from schema + routes + imports

```
Organization
├── Client ────────────── Client, ClientContact
│     └── Estate (Farm) ─ Farm, FarmAccess, LocationChangeRequest
│           ├── Plot ───── Plot, IrrigationConfiguration, BoundaryVersion, WalkTrack
│           │     └── CropCycle ─ CropCycle, CropVariety, Milestone, AgronomyPlan
│           ├── People ─── User, RoleDefinition, DailyCrewMuster
│           ├── Operations  Task, TaskExecution, MaterialUsage, LabourUsage
│           ├── Attendance  Attendance, AttendanceException
│           └── Spatial ─── (cross-cutting math; evidence: BoundaryVersion, WalkTrack)
├── Agronomy ─── CropMonitoring, AgronomyPrescription (+ Task origin=AGRONOMIST)
├── Incidents ── Incident, IncidentFollowUp
├── Harvest ──── HarvestLog
├── Inventory ── InventoryItem, InventoryTransaction
├── Finance ──── ExpenseLog
├── Evidence ─── MediaAsset (execution/monitoring/incident/selfie)
├── Reporting ── derived (dashboard, hq/analytics, insights, reports/daily)
├── Audit ────── AuditLog
└── Onboarding ─ OnboardingDraft → (Client + Farm + User + FarmAccess)
```

## Boundary challenges (decided)

- **Farm+Estate merged → `estates`.** Schema has only `Farm`; "estate" is
  UI vocabulary. One module, canonical term FARM (see CANONICAL_TERMS).
- **Crops+Planning merged → `cropping`.** CropCycle/Variety/Milestone/
  AgronomyPlan form one lifecycle; splitting plan from cycle caused the
  current agronomy/plots duplication.
- **Monitoring+Prescriptions → `agronomy`** (not separate). Prescription
  targets (farm/plot/cycle) mirror monitoring targets; same author/reader roles.
- **Spatial stays CROSS-CUTTING, not a peer entity owner.** It owns math +
  decisions (area, containment, geofence, walks, versions) but NOT Farm/Plot
  rows — those stay in `estates`. Evidence tables (BoundaryVersion,
  WalkTrack) are written only via `geo-versions.commitBoundary`.
- **Media/evidence stays its own module** (4+ parents reference MediaAsset).
- **Reporting has NO tables** — read-only composition over other modules.
  Any reporting query that needs a new index must propose it to the owning
  module.
- **Onboarding is orchestration**, not an entity owner: it creates
  Client+Farm+User+FarmAccess in one transaction, then hands off.
