# Agaate Farm Management PWA — User Flows


<!-- cortex:toc -->
- [1. High-Level System Flow](#1-high-level-system-flow)
- [2. Authentication Flow](#2-authentication-flow)
- [3. Super Admin: Farm & User Management](#3-super-admin-farm--user-management)
  - [3.1 Create Farm](#31-create-farm)
  - [3.2 Create User](#32-create-user)
- [4. Farm Admin: Farm Setup Flow](#4-farm-admin-farm-setup-flow)
  - [4.1 Complete Farm Setup](#41-complete-farm-setup)
  - [4.2 Plot Detail View](#42-plot-detail-view)
- [5. Agronomist: Planning & Monitoring](#5-agronomist-planning--monitoring)
  - [5.1 Dashboard Drill-Down](#51-dashboard-drill-down)
  - [5.2 Create 7-Day Agronomy Plan](#52-create-7-day-agronomy-plan)
- [6. Farm Officer: Daily Execution](#6-farm-officer-daily-execution)
  - [6.1 Complete Day Flow](#61-complete-day-flow)
  - [6.2 Task Execution Detail](#62-task-execution-detail)
- [7. Approval Flows](#7-approval-flows)
  - [7.1 Attendance Exception](#71-attendance-exception)
  - [7.2 Location Change Request](#72-location-change-request)
- [8. Incident Management Flow](#8-incident-management-flow)
- [9. Auto Reporting Flow](#9-auto-reporting-flow)
- [10. Biometric Enrollment Flow](#10-biometric-enrollment-flow)
- [11. Page Navigation Map](#11-page-navigation-map)
<!-- cortex:toc:end -->

**Version:** 1.0  
**Date:** 2026-08-30

---

## 1. High-Level System Flow

```mermaid
flowchart TB
    SA[Super Admin] -->|Creates/Manages| FARMS[Farms]
    SA -->|Creates/Manages| USERS[Users]
    
    FA[Farm Admin] -->|Configures| PLOTS[Plots]
    FA -->|Plans| CROPS[Crop Cycles]
    FA -->|Assigns| OFFICERS[Farm Officers]
    FA -->|Reviews| APPROVALS[Approvals]
    
    AG[Agronomist] -->|Views| ALL_FARMS[All Farms]
    AG -->|Creates| PLANS[7-Day Plans]
    AG -->|Reviews| INCIDENTS[Incidents]
    
    FO[Farm Officer] -->|Marks| ATTENDANCE[Attendance]
    FO -->|Executes| TASKS[Daily Tasks]
    FO -->|Uploads| PHOTOS[Crop Photos]
    FO -->|Reports| INC[Incidents]
    
    PLANS -->|Generates| TASKS
    CROPS -->|Generates| MILESTONES[Milestones]
    MILESTONES -->|Generates| TASKS
    
    TASKS -->|Captures| EVIDENCE[Materials + Labour + Photos]
    EVIDENCE -->|Feeds| REPORTS[Auto Reports]
    REPORTS -->|Visible to| SA & FA & AG
```

---

## 2. Authentication Flow

```mermaid
flowchart TD
    START([User Opens App]) --> LOGIN[/Login Page/]
    LOGIN -->|Enter Email + Password| VALIDATE{Credentials Valid?}
    VALIDATE -->|No| ERROR[Show Error Message]
    ERROR --> LOGIN
    VALIDATE -->|Yes| JWT[Create JWT Session Cookie]
    JWT --> ROLE{Check User Role}
    
    ROLE -->|SUPER_ADMIN| DASH_SA[Dashboard - Full View]
    ROLE -->|FARM_ADMIN| DASH_FA[Dashboard - Assigned Farms]
    ROLE -->|AGRONOMIST| DASH_AG[Dashboard - All Farms Read]
    ROLE -->|FARM_OFFICER| DASH_FO[Officer Day Screen]
    
    DASH_SA & DASH_FA & DASH_AG & DASH_FO --> APP([In-App Navigation])
    APP -->|Session Expired 8h| LOGIN
    APP -->|Logout| CLEAR[Clear Cookie] --> LOGIN
```

---

## 3. Super Admin: Farm & User Management

### 3.1 Create Farm

```mermaid
flowchart TD
    DASH([Dashboard]) -->|Click "New Farm"| FORM[/Farm Creation Form/]
    FORM -->|Fill Details| FIELDS[Farm Name, Owner, Location\nLat/Long, Area, Water Source]
    FIELDS -->|Submit| VALIDATE{Validation Pass?}
    VALIDATE -->|No| ERRORS[Show Field Errors]
    ERRORS --> FORM
    VALIDATE -->|Yes| CREATE[POST /api/farms]
    CREATE --> STATUS[Farm Created - Status: SETUP]
    STATUS --> HUB[Farm Hub Page]
```

### 3.2 Create User

```mermaid
flowchart TD
    ADMIN([Admin Console]) -->|Click "Add User"| FORM[/User Form/]
    FORM -->|Fill| FIELDS[Name, Email, Password, Role]
    FIELDS -->|Submit| CREATE[POST /api/users]
    CREATE --> ASSIGN{Role = FARM_ADMIN\nor FARM_OFFICER?}
    ASSIGN -->|Yes| ACCESS[Assign Farm Access]
    ASSIGN -->|No| DONE([User Created])
    ACCESS --> DONE
```

---

## 4. Farm Admin: Farm Setup Flow

### 4.1 Complete Farm Setup

```mermaid
flowchart TD
    FARM_HUB([Farm Hub - SETUP Status]) --> ADD_PLOT[Add Plot]
    
    ADD_PLOT --> PLOT_FORM[/Plot Form/]
    PLOT_FORM -->|Manual Entry| COORDS1[Enter Lat/Long Manually]
    PLOT_FORM -->|Auto Capture| COORDS2[Get Current GPS Location]
    COORDS1 & COORDS2 --> IRRIGATION[Configure Irrigation Types]
    IRRIGATION -->|Select Multiple| TYPES[Drip, Rain Pipe, Sprinkler, etc.]
    TYPES --> SAVE_PLOT[Save Plot - Status: SETUP]
    
    SAVE_PLOT --> ADD_CROP[Add Crop Cycle]
    ADD_CROP --> CROP_FORM[/Crop Cycle Wizard/]
    
    CROP_FORM --> STEP1[Step 1: Basic Info\nCrop Name, Dates, Establishment Type]
    STEP1 --> STEP2[Step 2: Varieties\nAdd Multiple Varieties]
    STEP2 --> STEP3[Step 3: Infrastructure\nBeds, Mulching, Plant Population]
    STEP3 --> STEP4[Step 4: Milestones\nAuto-generated + Custom]
    STEP4 --> SAVE_CROP[Save Crop Cycle - Status: PLANNED]
    
    SAVE_CROP --> CHECK{All Plots Have\nCrop Cycles?}
    CHECK -->|No| ADD_PLOT
    CHECK -->|Yes| ACTIVATE[Activate Farm]
    ACTIVATE --> ACTIVE([Farm Status: ACTIVE])
```

### 4.2 Plot Detail View

```mermaid
flowchart TD
    PLOT([Plot Page]) --> TABS{View Tab}
    
    TABS -->|Overview| OVERVIEW[Plot Info\nArea, Location, Soil Type\nIrrigation Config]
    TABS -->|Crop Cycles| CYCLES[Active/Planned/Completed\nCrop Cycles List]
    TABS -->|Monitoring| MONITOR[Crop Health History\nPhotos, Stages, Impact]
    
    CYCLES -->|Click Cycle| DETAIL[Cycle Details\nVarieties, Infrastructure\nMilestones, Tasks]
    DETAIL -->|Edit| EDIT_FORM[/Edit Crop Cycle Form/]
```

---

## 5. Agronomist: Planning & Monitoring

### 5.1 Dashboard Drill-Down

```mermaid
flowchart TD
    DASH([Agronomist Dashboard]) -->|KPIs| METRICS[Active Farms, Plots\nCrop Cycles, Tasks\nDelayed, Incidents]
    
    DASH -->|Select Farm| FARM[Farm View]
    FARM -->|Select Plot| PLOT[Plot View]
    PLOT -->|Select Crop| CROP[Crop Cycle View]
    CROP -->|View| HISTORY[Activity History\nPhotos & Incidents]
```

### 5.2 Create 7-Day Agronomy Plan

```mermaid
flowchart TD
    DASH([Dashboard]) -->|Navigate| TASKS[Tasks Page]
    TASKS -->|Click "New Task"| FORM[/Task Creation Form/]
    
    FORM --> SELECT_FARM[Select Farm]
    SELECT_FARM --> SELECT_PLOT[Select Plot]
    SELECT_PLOT --> SELECT_CROP[Select Crop Cycle]
    SELECT_CROP --> WEATHER{Check Weather?}
    
    WEATHER -->|Auto| FETCH[Fetch from Open-Meteo API]
    WEATHER -->|Manual| MANUAL[Enter Temperature, Humidity\nWind, Rain Forecast]
    WEATHER -->|Skip| ACTIVITY
    
    FETCH & MANUAL --> ACTIVITY[Define Activity]
    ACTIVITY --> DETAILS[Category, Title, Description\nInstructions, Priority, Due Date]
    DETAILS --> ASSIGN[Assign Farm Officer]
    ASSIGN --> CREATE[POST /api/tasks]
    CREATE --> NOTIFY([Task Appears in\nOfficer's Daily List])
```

---

## 6. Farm Officer: Daily Execution

### 6.1 Complete Day Flow

```mermaid
flowchart TD
    OPEN([Open App]) --> DAY[/My Day Screen/]
    DAY --> START{Day Started?}
    
    START -->|No| START_DAY[Start Day Flow]
    START_DAY --> SELFIE[Take Front-Camera Selfie]
    SELFIE --> LOCATION[Capture GPS Location]
    
    LOCATION --> GEO_CHECK{Location Within\nFarm Geofence?}
    GEO_CHECK -->|Yes| MARKED[✅ Attendance Marked]
    GEO_CHECK -->|No| EXCEPTION[Location Exception]
    EXCEPTION --> REASON[Enter Reason for\nLocation Mismatch]
    REASON --> PENDING[⏳ Sent to Admin\nfor Approval]
    
    MARKED & PENDING --> TASK_LIST[Today's Tasks]
    
    TASK_LIST --> TASKS{Task Sources}
    TASKS -->|Agronomist| AGR_TASKS[Agronomist Assigned Tasks]
    TASKS -->|System| SYS_TASKS[Milestone/Schedule Tasks]
    TASKS -->|Monitoring| MON_TASKS[Daily Crop Monitoring]
    
    AGR_TASKS & SYS_TASKS --> EXECUTE[Execute Task]
    EXECUTE --> TASK_FLOW[Start → Work → Complete]
    TASK_FLOW --> CAPTURE[Add Materials Used\nAdd Labour Hours\nUpload Photos\nAdd Remarks]
    CAPTURE --> COMPLETE[Mark Completed ✅]
    
    MON_TASKS --> MONITORING[Crop Monitoring]
    MONITORING --> HEALTH{Crop Health?}
    HEALTH -->|Good| GOOD[Upload Photo\nOptional Remarks]
    HEALTH -->|Poor| POOR[Upload Photo\nImpact %, Crop Stage\nRemarks]
    
    COMPLETE & GOOD & POOR --> MORE{More Tasks?}
    MORE -->|Yes| TASK_LIST
    MORE -->|No| INCIDENT{Any Incidents?}
    
    INCIDENT -->|Yes| REPORT[Report Incident]
    REPORT --> INC_FORM[Type, Level, Description\nPhotos, Severity]
    INC_FORM --> SUBMIT_INC[Submit Incident]
    INCIDENT -->|No| END_DAY
    
    SUBMIT_INC --> END_DAY[End Day Flow]
    END_DAY --> END_SELFIE[Take Selfie]
    END_SELFIE --> END_LOCATION[Capture Location]
    END_LOCATION --> DAY_COMPLETE([Day Completed ✅\nAuto Report Generated])
```

### 6.2 Task Execution Detail

```mermaid
flowchart TD
    TASK([Select Task]) --> VIEW[View Task Details\nTitle, Description\nInstructions, Priority]
    VIEW --> START[Start Activity]
    START --> WORK[Perform Field Work]
    WORK --> COMPLETE[Mark as Complete]
    
    COMPLETE --> MATERIALS[/Add Materials Used/]
    MATERIALS --> MAT_FIELDS[Material Name\nQuantity\nUnit]
    MAT_FIELDS -->|Add More?| MATERIALS
    MAT_FIELDS -->|Done| LABOUR
    
    LABOUR --> LAB_FIELDS[/Add Labour Usage/]
    LAB_FIELDS --> LAB_DATA[Number of Labourers\nHours Worked]
    LAB_DATA -->|System Calculates| CALC[Labour Hours = Labourers × Hours]
    CALC -->|Add More?| LABOUR
    CALC -->|Done| PHOTOS
    
    PHOTOS --> UPLOAD[Upload Activity Photos]
    UPLOAD --> REMARKS[/Add Remarks/]
    REMARKS --> SUBMIT[Submit Completion]
    SUBMIT --> UPDATE([Progress Auto-Updated])
```

---

## 7. Approval Flows

### 7.1 Attendance Exception

```mermaid
flowchart TD
    OFFICER[Officer Marks Attendance\nOutside Geofence] --> EXCEPTION[Exception Created\nStatus: PENDING]
    EXCEPTION --> REASON[Officer Provides Reason\nand Current Location]
    REASON --> ADMIN[Appears in Admin\nApprovals Console]
    
    ADMIN --> REVIEW{Admin Decision}
    REVIEW -->|Approve| APPROVED[Status: APPROVED\n✅ Attendance Valid]
    REVIEW -->|Reject| REJECTED[Status: REJECTED\n❌ Attendance Invalid]
    
    APPROVED & REJECTED --> LOG([Audit Log Created])
```

### 7.2 Location Change Request

```mermaid
flowchart TD
    OFFICER[Officer on Site\nFarm Location is Wrong] --> REQUEST[Raise Location\nChange Request]
    REQUEST --> FORM[Proposed Lat/Long\n+ Reason]
    FORM --> SUBMIT[POST /api/location-change-requests]
    SUBMIT --> PENDING[Status: PENDING]
    PENDING --> ADMIN[Admin Reviews]
    
    ADMIN --> DECISION{Decision}
    DECISION -->|Approve| UPDATE[Farm Location Updated\nStatus: APPROVED]
    DECISION -->|Reject| REJECT[Status: REJECTED\nNo Change]
    
    UPDATE & REJECT --> LOG([Audit Log Created])
```

---

## 8. Incident Management Flow

```mermaid
flowchart TD
    OFFICER[Farm Officer] -->|Report| INCIDENT[Create Incident]
    INCIDENT --> LEVEL{Incident Level}
    
    LEVEL -->|Farm| FARM_INC[Motor, Water, Electricity\nLabour, Infrastructure]
    LEVEL -->|Crop| CROP_INC[Disease, Pest\nNutrient Deficiency]
    LEVEL -->|Positive| POS_INC[Excellent Health\nGood Growth, Best Practice]
    
    FARM_INC & CROP_INC & POS_INC --> DETAILS[Add Description\nPhotos, Severity]
    DETAILS --> SUBMIT[Submit → Status: OPEN]
    
    SUBMIT --> VISIBLE[Visible to\nAgronomist + Admin]
    VISIBLE --> ACKNOWLEDGE[Agronomist Acknowledges\nStatus: ACKNOWLEDGED]
    ACKNOWLEDGE --> FOLLOWUP[Add Follow-Up Actions]
    FOLLOWUP --> MORE{More Follow-Ups?}
    MORE -->|Yes| FOLLOWUP
    MORE -->|No| RESOLVE[Status: RESOLVED]
    RESOLVE --> CLOSE([Status: CLOSED])
```

---

## 9. Auto Reporting Flow

```mermaid
flowchart TD
    ACTIONS[Daily Actions by All Officers] --> COLLECT{System Collects}
    
    COLLECT --> ATT[Attendance Data\nStart/End Time & Location]
    COLLECT --> TASKS[Task Completion Data\nAssigned/Completed/Pending]
    COLLECT --> RESOURCES[Resource Data\nMaterials + Labour Hours]
    COLLECT --> MONITORING[Monitoring Data\nCrop Health + Photos]
    COLLECT --> INCIDENTS[Incident Data\nNew Reports + Follow-Ups]
    
    ATT & TASKS & RESOURCES & MONITORING & INCIDENTS --> REPORT[/Auto-Generated\nDaily Report/]
    
    REPORT --> VIEWERS{Accessible By}
    VIEWERS --> SA[Super Admin\nAll Farms]
    VIEWERS --> FA[Farm Admin\nAssigned Farms]
    VIEWERS --> AG[Agronomist\nAll Farms - Crop Focus]
```

---

## 10. Presence & Geofence Verification Flow

```mermaid
flowchart TD
    ATTEND([Start / End Day]) --> CAPTURE[Capture Front-Camera Selfie]
    CAPTURE --> GPS[Read Device Geolocation Lat/Long]
    GPS --> S3[Upload Selfie to S3 Storage]
    S3 --> CALC[Server Calculates Haversine Distance to Farm Lat/Long]
    CALC --> CHECK{Distance <= Geofence Radius?}
    CHECK -->|Yes| MARK_OPEN[✅ Mark Status OPEN / COMPLETED]
    CHECK -->|No| REQ_REASON[Prompt Officer for Reason]
    REQ_REASON --> SUBMIT_EXC[Create Attendance Exception PENDING]
    SUBMIT_EXC --> ADMIN_REV[Admin Reviews & Approves/Rejects]
```

---

## 11. Page Navigation Map

```
/ (Root) → Redirect to /dashboard or /login

/login                              ← All unauthenticated users (Email + Password)
/dashboard                          ← All authenticated users (role-aware)

/farms/new                          ← Super Admin, Farm Admin
/farms/[farmId]                     ← Farm Hub (role-aware)

/plots/[plotId]                     ← Plot Detail
/plots/[plotId]/crop-cycles/new     ← Create Crop Cycle
/plots/[plotId]/crop-cycles/[id]/edit ← Edit Crop Cycle

/tasks                              ← Task Board (all roles, filtered)
/tasks/new                          ← Create Task (Agronomist, Admin)

/officer/day                        ← Farm Officer "My Day"
/officer/reports                    ← Officer Field Reports

/reports/daily                      ← Auto-generated Daily Reports

/admin/users                        ← User Management (Super Admin)
/admin/approvals                    ← Approval Console (Admin)
```
