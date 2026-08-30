# Agaate Farm Management PWA — Product Requirements Document (PRD)


<!-- cortex:toc -->
- [1. Executive Summary](#1-executive-summary)
  - [Core Product Philosophy](#core-product-philosophy)
  - [MVP Key Differentiator](#mvp-key-differentiator)
- [2. Platform Hierarchy](#2-platform-hierarchy)
  - [Core Data Structure](#core-data-structure)
- [3. User Roles & Permissions](#3-user-roles--permissions)
  - [3.1 Super Admin (Agaate)](#31-super-admin-agaate)
  - [3.2 Farm Admin](#32-farm-admin)
  - [3.3 Agronomist (Central Agaate Team)](#33-agronomist-central-agaate-team)
  - [3.4 Farm Officer](#34-farm-officer)
- [4. Feature Specifications](#4-feature-specifications)
  - [F1: Farm Creation & Management](#f1-farm-creation--management)
  - [F2: Plot Management](#f2-plot-management)
  - [F3: Plot Irrigation Configuration](#f3-plot-irrigation-configuration)
  - [F4: Crop Cycle Management](#f4-crop-cycle-management)
  - [F5: Multiple Variety Selection](#f5-multiple-variety-selection)
  - [F6: Crop Infrastructure Planning](#f6-crop-infrastructure-planning)
    - [Bed Preparation](#bed-preparation)
    - [Mulching Configuration](#mulching-configuration)
    - [Plant Population Planning](#plant-population-planning)
  - [F7: Crop Milestone Planning](#f7-crop-milestone-planning)
  - [F8: Additional Crop Support Activities](#f8-additional-crop-support-activities)
  - [F9: Farm Officer Assignment](#f9-farm-officer-assignment)
  - [F10: Attendance & Location Validation](#f10-attendance--location-validation)
  - [F11: Biometric Verification](#f11-biometric-verification)
  - [F12: Agronomist Dashboard](#f12-agronomist-dashboard)
  - [F13: 7-Day Agronomy Plan](#f13-7-day-agronomy-plan)
  - [F14: Weather Information](#f14-weather-information)
  - [F15: Farm Officer Daily Work Screen ("My Day")](#f15-farm-officer-daily-work-screen-my-day)
  - [F16: Daily Tasks (Three Sources)](#f16-daily-tasks-three-sources)
  - [F17: Daily Crop Monitoring](#f17-daily-crop-monitoring)
  - [F18: Incident Reporting](#f18-incident-reporting)
  - [F19: Daily Labour Tracking](#f19-daily-labour-tracking)
  - [F20: Activity Completion Flow](#f20-activity-completion-flow)
  - [F21: Automatic Reporting](#f21-automatic-reporting)
  - [F22: Progress Visibility](#f22-progress-visibility)
- [5. Non-Functional Requirements](#5-non-functional-requirements)
- [6. Success Metrics](#6-success-metrics)
- [7. Out of Scope (MVP)](#7-out-of-scope-mvp)
<!-- cortex:toc:end -->

**Version:** 1.0  
**Date:** 2026-08-30  
**Product Owner:** Agaate  
**Platform:** Progressive Web Application (PWA)  
**Status:** MVP — Farm Operations & Agronomy Management

---

## 1. Executive Summary

Agaate Farm Management PWA is a centralized platform to manage **multiple farms simultaneously**, with role-based access for Super Admins, Farm Admins, Agronomists, and Farm Officers. The system enables end-to-end farm lifecycle management from setup through daily execution, monitoring, and intelligence gathering.

### Core Product Philosophy

> **Setup → Plan → Assign → Execute → Capture → Monitor → Improve**

### MVP Key Differentiator

The platform creates a **continuous operational and agronomy feedback loop**:

```
Farm Setup → Crop Planning → Agronomist Planning → Daily Execution →
Visual Monitoring → Incident Detection → Agronomy Action → Data Capture
```

Over time, Agaate builds structured intelligence around farm operations, crop stages, labour efficiency, material utilization, crop health, incidents, agronomy actions, and location-based farm performance — the foundation for a future **Farm Intelligence & AI Agronomy Engine**.

---

## 2. Platform Hierarchy

```
AGAATE — SUPER ADMIN
│
├── FARM A
│   ├── Admin(s)
│   ├── Farm Officer(s)
│   ├── Plot 1 → Crop Cycle
│   ├── Plot 2 → Crop Cycle
│   └── Plot 3 → Crop Cycle
│
├── FARM B
│   ├── Admin(s)
│   ├── Farm Officer(s)
│   └── Multiple Plots
│
└── FARM C
    └── Multiple Plots

CENTRAL AGAATE AGRONOMIST
└── Visibility Across All Farms
```

### Core Data Structure

```
Farm → Plot → Crop → Variety → Crop Cycle → Activities → Execution → Incidents
```

---

## 3. User Roles & Permissions

### 3.1 Super Admin (Agaate)

The highest authority on the platform with **unrestricted access**. Can perform actions of all other roles.

| Capability | Description |
|---|---|
| Farm Management | Add, edit, view all farms |
| User Management | Add/edit Farm Admins and Farm Officers |
| Data Visibility | View all plots, crop cycles, activities, attendance, location logs |
| Approvals | Approve location change requests, attendance exceptions |
| Agronomy | Create agronomy plans, view incidents |

### 3.2 Farm Admin

One Farm Admin can be assigned to **multiple farms**.

| Capability | Description |
|---|---|
| Farm Setup | Add farm details, plots, lat/long, irrigation config |
| Crop Planning | Add crop cycles, infrastructure details, milestones |
| Officer Management | Assign and manage Farm Officers |
| Monitoring | Review attendance exceptions, approve/reject location requests |
| Progress Tracking | Monitor daily work progress |

### 3.3 Agronomist (Central Agaate Team)

Operates **centrally across all farms**.

| Capability | Description |
|---|---|
| Cross-Farm Visibility | View progress of all farms, plots, crops |
| Crop Health | View crop photos, health status (Good/Poor) |
| 7-Day Planning | Create rolling 7-day agronomy plans |
| Activity Planning | Fertilization, crop protection, cultural practices |
| Incident Review | Review incidents, add follow-up actions |

**Core Agronomist View:**
```
All Farms → All Plots → Active Crops → 7-Day Plan → Activity Status
```

### 3.4 Farm Officer

Simple, action-based interface for field execution.

**Daily Flow:**
```
Start Day → Execute Tasks → Capture Data → Upload Photos → Report Incidents → End Day
```

Multiple officers per farm supported for shift-based operations, multiple locations, and simultaneous activities. All logins and actions are recorded individually for complete traceability.

---

## 4. Feature Specifications

### F1: Farm Creation & Management

**Farm Entity Fields:**

| Field | Type | Required |
|---|---|---|
| Farm Name | String | ✅ |
| Client / Owner Name | String | ✅ |
| Location | String | ✅ |
| Address | String | ❌ |
| Latitude | Decimal(10,7) | ✅ |
| Longitude | Decimal(10,7) | ✅ |
| Total Area | Decimal(12,2) | ✅ |
| Cultivable Area | Decimal(12,2) | ✅ |
| Water Source | String | ✅ |
| Status | Enum | ✅ |
| Geofence Radius | Int (meters) | ✅ (default 500m) |

**Farm Statuses:** `SETUP` → `ACTIVE` → `INACTIVE` / `COMPLETED`

**Farm Activation Criteria:**
- Farm is created
- Plots are added
- Crops are planned
- Milestones are configured

### F2: Plot Management

Each farm can have multiple plots. Farm Admin adds plot-level details.

| Field | Type | Required |
|---|---|---|
| Plot Name / Number | String | ✅ |
| Plot Area | Decimal(12,2) | ✅ |
| Latitude | Decimal(10,7) | ✅ |
| Longitude | Decimal(10,7) | ✅ |
| Soil Type | String | ❌ |
| Status | Enum | ✅ |

**Plot Location Capture:**
- **Manual Entry:** Admin enters lat/long directly
- **Auto Capture:** App captures current GPS coordinates when admin is physically present

**Plot Statuses:** `SETUP`, `ACTIVE`, `INACTIVE`, `ARCHIVED`

### F3: Plot Irrigation Configuration

Each plot supports **multiple irrigation types** simultaneously.

**Irrigation Options:** Drip, Rain Pipe, Sprinkler, Flood, Other

### F4: Crop Cycle Management

Created at the Plot level.

| Field | Type | Required |
|---|---|---|
| Crop Name | String | ✅ |
| Start Date | Date | ✅ |
| Expected First Harvest Date | Date | ❌ |
| Establishment Type | Enum | ✅ |

**Establishment Types:** `NURSERY_TRANSPLANTATION`, `DIRECT_SOWING`

**Crop Cycle Statuses:** `PLANNED`, `ACTIVE`, `COMPLETED`, `CANCELLED`

### F5: Multiple Variety Selection

A single Crop Cycle can contain multiple varieties (e.g., Watermelon → Variety A, B, C).

### F6: Crop Infrastructure Planning

#### Bed Preparation
- Enable/disable bed preparation per crop cycle
- Fields: Bed Width, Bed Centre-to-Centre Distance, Expected Beds per Acre
- **Auto-calculation:** `Expected Total Beds = Beds per Acre × Plot Area`
- Farm Officer captures actual beds during execution → system shows Expected vs Actual

#### Mulching Configuration
- Enable/disable mulching
- **Hole Patterns:** Single Line or Double Line (Zigzag)
- Field: Plant-to-Plant Distance

#### Plant Population Planning
- Expected Plants per Acre
- **Auto-calculation:** `Expected Plant Count = Plants per Acre × Plot Area`
- Farm Officer captures actual plants → system shows Expected vs Actual + Variance

### F7: Crop Milestone Planning

**Standard Milestones** (auto-generated based on crop config):

| # | Milestone | Dynamic Name Logic |
|---|---|---|
| 1 | Land Preparation | Always "Land Preparation" |
| 2 | Mulching & TP/Sowing Readiness | Name depends on mulching selection |
| 3 | Transplantation / Direct Sowing | Name depends on establishment type |
| 4 | First Harvest | Always "First Harvest" |

**Milestone Statuses:** `PENDING`, `IN_PROGRESS`, `COMPLETED`, `SKIPPED`

### F8: Additional Crop Support Activities

Admin can select one or multiple during crop planning:
- Crop Cover, Bamboo Stacking, Trellising, Net Support, Rope Support, Other
- Each with optional Target Date and Remarks

### F9: Farm Officer Assignment

Multiple officers per farm, each with:
- Individual Login
- Individual Attendance Logs
- Individual Activity Logs
- Individual Incident Reports

### F10: Attendance & Location Validation

**Start Day Flow:**
1. Take Front-Camera Selfie
2. Capture Current GPS Location
3. System records: Date, Time, Selfie Key, Lat/Long, and validates distance against Farm geofence

**End Day Flow:** Same as Start Day

**Location Matching Logic:**

| Scenario | Action |
|---|---|
| Location matches farm (≤500m) | Attendance marked successfully (`OPEN`) |
| Location mismatch (>500m) | Exception created (`EXCEPTION_PENDING`) → Officer provides reason → Admin approval required |
| Farm location needs change | Officer raises Location Change Request → Admin approves/rejects |

### F11: Agronomist Dashboard

**Dashboard KPIs:**
- Total Active Farms / Plots
- Active Crop Cycles
- Activities: Planned / Completed / Pending / Delayed
- Incidents count
- Poor Crop Health Updates

**Drill-down:** All Farms → Select Farm → View Plots → View Crops → View Activity History → View Photos & Incidents

### F13: 7-Day Agronomy Plan

Rolling 7-day activity plan created by Agronomist.

**Activity Categories:**

| Category | Sub-types |
|---|---|
| Fertilization | Fertigation, Foliar Nutrition, Soil Application |
| Crop Protection | Preventive Spray, Pest Control, Disease Control |
| Other Agronomy | Crop Monitoring, Irrigation Recommendation, Cultural Practices, Crop-specific |

**Activity Creation Fields:** Date, Farm, Plot, Crop, Activity Type, Description, Instructions, Priority, Assigned Officer

Activities automatically appear in the Farm Officer's Daily Task List.

### F14: Weather Information

- **Auto Weather:** Integration via Open-Meteo API based on farm/plot location
- **Manual Entry:** Temperature, Rain Forecast, Humidity, Wind, Remarks

### F15: Farm Officer Daily Work Screen ("My Day")

```
START DAY
  ↓
TODAY'S TASKS
  ├── Agronomist Allocated Tasks
  ├── System Generated Tasks
  └── Daily Crop Monitoring
  ↓
REPORT INCIDENT
  ↓
END DAY
```

### F16: Daily Tasks (Three Sources)

| Source | Description |
|---|---|
| Agronomist Allocated | Tasks directly created by the Agronomist |
| System Generated | Based on milestones, planned activities, target dates, pending follow-ups |
| Daily Crop Monitoring | Farm Officer updates crop condition at plot/crop level |

### F17: Daily Crop Monitoring

Mandatory daily crop picture upload with health classification.

**Good Crop Update:** Photo + Remarks (optional)

**Poor Crop Update:** Photo + Impact Percentage + Crop Stage + Remarks

**Crop Stages:** Germination, Establishment, Vegetative, Flowering, Fruiting, Harvesting

### F18: Incident Reporting

Report at Farm, Plot, or Crop level.

| Level | Example Incidents |
|---|---|
| Farm | Motor Issue, Water Issue, Electricity, Labour, Infrastructure, External |
| Crop | Disease, Pest, Nutrient Deficiency, Growth Issue, Water Stress |
| Positive | Excellent Health, Good Growth, Best Practice, High Flowering, Good Fruit Setting |

**Incident Fields:** Type, Level, Description, Photos, Severity/Impact

**Incident Flow:** Officer → Report → Central Database → Agronomist/Admin Visibility → Action/Follow-up

**Incident Statuses:** `OPEN`, `ACKNOWLEDGED`, `RESOLVED`, `CLOSED`

### F19: Daily Labour Tracking

For each activity: Activity Name, Number of Labourers, Hours Used.

**Auto-calculation:** `Labour Hours = Labourers × Hours`

### F20: Activity Completion Flow

```
Task Generated (Agronomist Assigned / System Generated)
  → Farm Officer
    → Start Activity
      → Complete Activity
        → Add Material Used
          → Add Labour Hours
            → Upload Photos
              → Add Remarks
                → Mark Completed
                  → Auto Progress Update
```

### F21: Automatic Reporting

No manual daily reports — system auto-generates from actions.

**Daily Auto Report includes:**
- Attendance (start/end time, location)
- Work (tasks assigned/completed/pending)
- Resources (materials used, labour hours)
- Monitoring (good/poor crop updates, incidents, photos)

### F22: Progress Visibility

Multi-level visibility: Activity → Crop → Plot → Farm → All Farms

| Role | Visibility |
|---|---|
| Super Admin | Everything |
| Farm Admin | Assigned farms |
| Agronomist | All farms and crop progress |
| Farm Officer | Assigned farms and daily tasks only |

---

## 5. Non-Functional Requirements

| Requirement | Specification |
|---|---|
| Platform | PWA (installable, works offline for basic features) |
| Authentication | JWT sessions (8h expiry), bcrypt password hashing |
| Biometric Security | Encrypted face embeddings (AES-256-GCM), WebAuthn passkeys, liveness challenges |
| Storage | S3-compatible (MinIO for local dev) for media assets |
| Database | PostgreSQL 16 via Prisma ORM |
| Geolocation | Haversine distance calculation, configurable geofence radius |
| Audit Trail | Complete audit logging for all entity changes |
| Rate Limiting | In-memory rate limiting for API endpoints |
| Performance | Server-side rendering with Next.js, pagination for lists |
| Security | HttpOnly cookies, CORS, input validation (Zod), no `X-Powered-By` |

---

## 6. Success Metrics

| Metric | Target |
|---|---|
| Daily active officers completing Start/End Day | >90% of assigned officers |
| Task completion rate | >80% within due dates |
| Daily crop photo uploads | 100% of active plots monitored |
| Incident response time | <24h from report to acknowledgement |
| System auto-report generation | 100% automated, zero manual reports |

---

## 7. Out of Scope (MVP)

- AI/ML-based crop disease detection
- Harvest yield tracking and market integration
- Financial/accounting modules
- Multi-language support
- Native mobile apps (iOS/Android)
- Offline-first with sync (basic PWA caching only)
- Variety-wise area tracking per crop cycle
