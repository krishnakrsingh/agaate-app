Below is the revised, consolidated BRD with **Projects removed** and the complete structure redesigned around **Super Admin → Multiple Farms → Plots → Crop Cycles → Agronomy Planning → Farm Officer Execution**.

**Agaate Farm Management PWA**

**Business Requirement Document (BRD) – MVP**

**Platform:** Progressive Web Application (PWA)  
**Product Owner:** Agaate  
**Version:** MVP – Farm Operations & Agronomy Management

**1\. Product Objective**

Agaate Farm Management PWA will be a centralized platform to manage **multiple farms simultaneously**, with role-based access for Farm Admins, Agronomists, and Farm Officers.

The platform will enable:

- Multi-farm management
- Plot-level crop planning
- Crop infrastructure planning
- Agronomy-led weekly planning
- Daily farm officer task execution
- Attendance and location validation
- Activity and labour tracking
- Visual crop monitoring
- Incident reporting
- Centralized farm intelligence

**Core Product Philosophy**

**Setup → Plan → Assign → Execute → Capture → Monitor → Improve**

**2\. Platform Hierarchy**

AGAATE – SUPER ADMIN

│

├── FARM A

│ ├── Admin

│ ├── Farm Officers

│ ├── Plot 1

│ │ └── Crop Cycle

│ ├── Plot 2

│ │ └── Crop Cycle

│ └── Plot 3

│

├── FARM B

│ ├── Admin

│ ├── Farm Officers

│ └── Multiple Plots

│

└── FARM C

└── Multiple Plots

CENTRAL AGAATE AGRONOMIST

│

└── Visibility Across All Farms

**Core Data Structure**

**Farm → Plot → Crop → Variety → Crop Cycle → Activities → Execution → Incidents**

**3\. User Roles**

**3.1 Super Admin – Agaate**

Super Admin is the highest authority on the platform.

**Access**

Super Admin can:

- Add and manage all Farms
- Add or edit Farm Admins
- Add or edit Farm Officers
- View all Farms
- View all Plots
- View all Crop Cycles
- View all activities
- Create activities
- Update activities
- View attendance
- View location logs
- Approve location change requests
- Approve attendance exceptions
- View incidents
- Create agronomy plans
- Perform all actions available to every other role

**Key Principle**

**Super Admin has unrestricted access and can perform actions of all other roles whenever required.**

**3.2 Farm Admin**

One Farm Admin can be assigned access to **multiple Farms**.

**Responsibilities**

- Manage assigned Farms
- Add Farm details
- Add and manage Plots
- Add Plot Latitude & Longitude
- Configure Plot Irrigation
- Add Crop Cycles
- Add Crop Infrastructure details
- Monitor farm progress
- Manage Farm Officers
- Review attendance exceptions
- Approve/reject location-related requests
- Monitor daily work progress

**Access**

ADMIN A

├── Farm A

├── Farm B

└── Farm C

**3.3 Agronomist – Central Agaate Team**

Agronomists operate centrally across all Farms.

**Responsibilities**

- View progress of all Farms
- View plot-level crop status
- View crop photos
- Monitor crop health
- View Poor / Good crop updates
- Review incidents
- Create 7-day agronomy plans
- Plan fertilization activities
- Plan crop protection activities
- Add follow-up actions
- Monitor completion of planned activities

**Core Agronomist View**

**All Farms → All Plots → Active Crops → 7-Day Plan → Activity Status**

**3.4 Farm Officer**

Farm Officer will have a **simple, action-based interface**.

The Farm Officer's role is primarily:

**Start Day → Execute Tasks → Capture Data → Upload Photos → Report Incidents → End Day**

Farm Officers can be multiple for a single farm due to:

- Shift-based operations
- Multiple locations
- Multiple activities

All logins and actions will be recorded individually.

**4\. Farm Creation**

A Farm is the highest operational unit in the application.

**Farm Details**

- Farm Name
- Client / Owner Name
- Location
- Address
- Latitude
- Longitude
- Total Area
- Cultivable Area
- Water Source
- Farm Status

**Farm Status**

- Setup
- Active
- Inactive
- Completed

**5\. Plot Management**

Each Farm can have multiple Plots.

Farm Admin will add Plot-level details.

**Plot Details**

- Plot Name / Number
- Plot Area
- Latitude
- Longitude
- Soil Type (Optional)
- Plot Status

**Plot Location Capture**

Latitude and Longitude can be added through:

**Option 1: Manual Entry**

Admin manually enters:

- Latitude
- Longitude

**Option 2: Auto Location Capture**

If the Admin is physically present at the Plot:

**Get Current Location**

The application automatically captures Latitude and Longitude.

**6\. Plot Irrigation Configuration**

Each Plot should support **multiple irrigation types**.

**Example**

A plot may have:

- Drip
- Rain Pipe
- Sprinkler

The system should allow selecting one or multiple options.

**Irrigation Options**

- Drip
- Rain Pipe
- Sprinkler
- Flood
- Other

**7\. Crop Cycle Creation**

Crop Cycle is created at the Plot level.

**Basic Crop Details**

- Crop Name
- Crop Cycle Start Date
- Expected First Harvest Date
- Nursery TP / Direct Sowing

**Crop Establishment Type**

Select one:

- **Nursery Transplantation**
- **Direct Sowing**

**8\. Multiple Variety Selection**

A single Crop Cycle can contain multiple varieties.

**Example**

**Crop:** Watermelon

Varieties:

- Variety A
- Variety B
- Variety C

The Farm Admin should be able to add:

- Multiple Varieties
- Variety-wise area (optional future enhancement)

For MVP:

Multiple varieties should be supported under one Crop Cycle.

**9\. Crop Infrastructure Planning**

While creating the Crop Cycle, Farm Admin will configure the crop infrastructure.

**9.1 Bed Preparation**

Fields:

- Bed Preparation: Yes / No
- Bed Width
- Bed Centre-to-Centre Distance
- Expected Bed Count per Acre

**Automatic Calculation**

System calculates:

**Expected Total Beds = Expected Beds per Acre × Plot Area**

**Actual Bed Count**

When the Farm Officer completes the **Bed Preparation Activity**, he will enter:

- Actual Beds Created

The system will show:

Expected Beds vs Actual Beds

**10\. Mulching Configuration**

**Mulching**

- Yes
- No

If **Yes**, Mulching-related fields become active.

**Hole Pattern**

**Option 1: Single Line**

Fields:

- Plant-to-Plant Distance

**Option 2: Double Line – Zigzag**

Fields:

- Plant-to-Plant Distance

Future calculation logic can use this information for expected plant population.

**11\. Plant Population Planning**

During crop planning:

**Planned Data**

- Expected Plants per Acre

System calculates:

**Expected Plant Count = Plants per Acre × Plot Area**

**Actual Plant Count**

When the Farm Officer completes:

**Transplantation / Sowing Activity**

He will enter:

- Approximate Actual Plants

System will show:

| **Parameter**   | **Value**          |
| --------------- | ------------------ |
| Expected Plants | Auto Calculated    |
| Actual Plants   | Farm Officer Entry |
| Variance        | Auto Calculated    |

**12\. Crop Milestone Planning**

Crop milestones will be created during Crop Planning.

**Standard Milestones**

**1\. Land Preparation**

Includes:

- Field preparation
- Bed preparation

**Target Date**

**2\. Mulching & TP / Sowing Readiness**

This activity depends on Mulching selection.

**If Mulching = YES**

Activity Name:

**Mulching & TP / Sowing Readiness**

**If Mulching = NO**

Activity Name:

**TP / Sowing Readiness**

This milestone represents:

Plot readiness for Transplantation or Direct Sowing.

**3\. Transplantation / Direct Sowing**

The activity name should automatically depend on Crop Establishment Type.

| **Establishment Type** | **Activity**    |
| ---------------------- | --------------- |
| Nursery                | Transplantation |
| Direct Sowing          | Direct Sowing   |

**4\. First Harvest**

Expected first harvest milestone.

**13\. Additional Crop Support Activities**

During crop planning, Admin can select one or multiple additional requirements.

Examples:

- Crop Cover
- Bamboo Stacking
- Trellising
- Net Support
- Rope Support
- Other

Each selected activity can have:

- Target Date
- Remarks

**14\. Crop Planning Structure**

PLOT

│

└── CROP CYCLE

│

├── Crop & Varieties

├── Nursery TP / Direct Sowing

├── Irrigation Setup

├── Bed Planning

├── Mulching Configuration

├── Plant Planning

│

└── MILESTONES

├── Land Preparation

├── Mulching / TP Ready

├── Transplantation / Sowing

├── Crop Support Activities

└── First Harvest

**15\. Farm Activation**

Once:

- Farm is created
- Plots are added
- Crops are planned
- Milestones are configured

The Farm becomes:

**ACTIVE**

Once Active:

- Farm Admin can assign Farm Officers
- Agronomist gets complete visibility
- 7-Day Agronomy Planning can begin
- Daily task execution begins

**16\. Farm Officer Assignment**

A Farm can have multiple Farm Officers.

This is required for:

- Shift operations
- Multiple plots
- Large farms
- Multiple simultaneous activities

**Important**

Every Farm Officer will have:

- Individual Login
- Individual Attendance Logs
- Individual Activity Logs
- Individual Incident Reports

This ensures complete action traceability.

**17\. Farm Officer Attendance & Location Validation**

Farm Officer's day will start and end through the application.

**Start Day**

Farm Officer must:

1. Take a Selfie
2. Capture Current Location
3. Start Day

The system records:

- Date
- Time
- Selfie
- Latitude
- Longitude

**End Day**

Farm Officer must:

1. Take Selfie
2. Capture Current Location
3. End Day

The system records:

- Date
- Time
- Selfie
- Latitude
- Longitude

**18\. Location Matching Logic**

The system compares Farm Officer location with the assigned Farm location.

**Scenario 1 – Location Matches**

Attendance marked successfully.

**Scenario 2 – Location Does Not Match**

The system creates an exception.

The Farm Officer must provide:

- Reason
- Current Location

Request goes to:

**Farm Admin for Approval**

**Scenario 3 – Farm Location Needs Change**

Farm Officer can raise:

**Location Change Request**

The request is sent to Farm Admin.

Farm Admin can:

- Approve
- Reject

All changes should maintain an audit log.

**19\. Agronomist Dashboard**

Agronomist will have centralized visibility across all active Farms.

**Dashboard Parameters**

- Total Active Farms
- Total Active Plots
- Active Crop Cycles
- Activities Planned
- Activities Completed
- Pending Activities
- Delayed Activities
- Incidents
- Poor Crop Health Updates

**Farm-Level View**

Agronomist can drill down:

ALL FARMS

↓

SELECT FARM

↓

VIEW PLOTS

↓

VIEW CROPS

↓

VIEW ACTIVITY HISTORY

↓

VIEW PHOTOS & INCIDENTS

**20\. 7-Day Agronomy Plan**

The Agronomist will create a rolling **7-Day Activity Plan**.

Primary activity categories:

**1\. Fertilization**

- Fertigation
- Foliar Nutrition
- Soil Application

**2\. Crop Protection**

- Preventive Spray
- Pest Control
- Disease Control

**3\. Other Agronomy Activities**

- Crop Monitoring
- Irrigation Recommendation
- Cultural Practices
- Crop-specific Activities

**Agronomist Activity Creation**

For each activity:

- Date
- Farm
- Plot
- Crop
- Activity Type
- Activity Description
- Instructions
- Priority
- Assigned Farm Officer

Once created:

**Activity automatically appears in the Farm Officer's Daily Task List.**

**21\. Weather Information**

The Agronomist can use weather information while planning.

**Option 1 – Auto Weather**

Weather automatically picked based on Farm / Plot location.

Possible integration:

- Google Weather / Weather API

**Option 2 – Manual Weather Entry**

Agronomist can add:

- Temperature
- Rain Forecast
- Humidity
- Wind
- Other Remarks

This will support agronomy decision-making.

**22\. Farm Officer Daily Work Screen**

The Farm Officer interface should be extremely simple.

**My Day**

START DAY

TODAY'S TASKS

1\. Assigned by Agronomist

2\. System Generated

3\. Daily Crop Monitoring

REPORT INCIDENT

END DAY

**23\. Daily Tasks – Three Sources**

**A. Agronomist Allocated Tasks**

Tasks directly created by the Agronomist.

Example:

Farm A – Plot 2  
Tomato  
Apply Fertigation as per recommendation.

**B. System Generated Tasks**

System-generated activities based on:

- Crop Milestones
- Planned Crop Activities
- Target Dates
- Pending Follow-ups

Example:

Today: Transplantation Due

**C. Daily Crop Monitoring**

Farm Officer must update crop condition at Plot/Crop level.

**24\. Daily Crop Pictures**

Daily crop monitoring will be mandatory.

Farm Officer should upload crop pictures.

**Crop Health Classification**

- Good
- Poor

**Good Crop Update**

Farm Officer uploads:

- Crop Photo
- Remarks (Optional)

**Poor Crop Update**

Farm Officer uploads:

- Crop Photo
- Impact Percentage
- Crop Stage
- Remarks

**Example**

Crop: Tomato

Status: Poor

Impact: 20%

Stage:

Vegetative

Remarks:

Yellowing observed in some plants.

This information becomes visible to the Agronomist.

**25\. Crop Stage Capture**

While adding daily crop updates, Farm Officer selects Crop Stage.

Examples:

- Germination
- Establishment
- Vegetative
- Flowering
- Fruiting
- Harvesting

This helps the Agronomist understand the context of crop health.

**26\. Incident Reporting**

Farm Officer can report an incident at any time.

Incidents can be reported at:

- Farm Level
- Plot Level
- Crop Level

**A. Farm-Level Incidents**

Examples:

- Motor Issue
- Water Issue
- Electricity Issue
- Labour Issue
- Infrastructure Issue
- External Issue

**B. Crop-Level Incidents**

Examples:

- Disease
- Pest
- Nutrient Deficiency
- Growth Issue
- Water Stress

**C. Positive Incidents**

Examples:

- Excellent Crop Health
- Good Growth
- Best Practice
- High Flowering
- Good Fruit Setting

**27\. Incident Reporting Flow**

Farm Officer adds:

- Incident Type
- Incident Level
- Description
- Photos
- Severity / Impact

Then:

FARM OFFICER

↓

REPORT INCIDENT

↓

CENTRAL DATABASE

↓

AGRONOMIST / ADMIN VISIBILITY

↓

ACTION / FOLLOW-UP

**28\. Daily Labour Tracking**

Farm Officer should capture labour utilization for activities completed during the day.

For each activity:

- Activity Name
- Number of Labourers
- Hours Used

**System Calculation**

**Labour Hours = Number of Labourers × Hours**

Example:

| **Activity**    | **Labour** | **Hours** | **Total Labour Hours** |
| --------------- | ---------- | --------- | ---------------------- |
| Bed Preparation | 5          | 6         | 30                     |
| Mulching        | 4          | 5         | 20                     |

**Daily Total**

**Total Daily Labour Hours = 50**

This will later help Agaate understand:

- Activity efficiency
- Labour utilization
- Crop-wise labour requirement
- Farm productivity

**29\. Activity Completion Flow**

TASK GENERATED

│

├── Agronomist Assigned

└── System Generated

↓

FARM OFFICER

↓

START ACTIVITY

↓

COMPLETE ACTIVITY

↓

ADD MATERIAL USED

↓

ADD LABOUR HOURS

↓

UPLOAD PHOTOS

↓

ADD REMARKS

↓

MARK COMPLETED

↓

AUTO PROGRESS UPDATE

**30\. Automatic Reporting**

Farm Officers should **not manually create daily reports**.

The system automatically creates reports based on actions.

**Daily Auto Report**

**Attendance**

- Start Time
- Start Location
- End Time
- End Location

**Work**

- Tasks Assigned
- Tasks Completed
- Pending Tasks

**Resources**

- Materials Used
- Labour Hours

**Monitoring**

- Good Crop Updates
- Poor Crop Updates
- Incidents Reported
- Photos Uploaded

**31\. Progress Visibility**

Progress should be available at multiple levels.

ACTIVITY

↓

CROP

↓

PLOT

↓

FARM

↓

ALL FARMS

**Super Admin**

Can see everything.

**Farm Admin**

Can see assigned Farms.

**Agronomist**

Can see all Farms and crop progress.

**Farm Officer**

Can see only assigned Farms and daily tasks.

**32\. Role-Based Flow Summary**

| **Role**                 | **Primary Responsibility** | **Key Actions**                                       |
| ------------------------ | -------------------------- | ----------------------------------------------------- |
| **Super Admin – Agaate** | Complete platform control  | Manage all farms, users, activities & approvals       |
| **Farm Admin**           | Farm setup & monitoring    | Add plots, crops, infrastructure, officers            |
| **Agronomist**           | Agronomy planning          | View all farms, create 7-day plan, review crop health |
| **Farm Officer**         | Field execution            | Execute tasks, photos, labour, incidents              |

**33\. Complete MVP Flow**

SUPER ADMIN

│

│ Creates / Manages Farms

↓

FARM ADMIN

│

├── Add Plot

├── Add Location

├── Add Irrigation

├── Add Crop

├── Add Varieties

├── Add Crop Infrastructure

└── Add Crop Milestones

↓

FARM ACTIVE

↓

ASSIGN FARM OFFICERS

↓

AGRONOMIST

│

├── View All Farms

├── Monitor Progress

├── Check Weather

└── Create 7-Day Plan

↓

DAILY TASKS

↓

FARM OFFICER

│

┌───────────┼────────────┐

↓ ↓ ↓

Execute Crop Photos Incident

Tasks Good/Poor Reporting

│ │ │

↓ ↓ ↓

Material % Impact Admin /

Used & Stage Agronomist

│

↓

Labour Hours

│

↓

AUTO REPORTING

│

↓

FARM PROGRESS UPDATE

**34\. MVP Key Differentiator**

The Agaate Farm Management PWA is not just a task management app.

It creates a **continuous operational and agronomy feedback loop**:

**Farm Setup → Crop Planning → Agronomist Planning → Daily Execution → Visual Monitoring → Incident Detection → Agronomy Action → Data Capture**

**Long-Term Data Asset**

Over time, Agaate will build structured intelligence around:

- Farm operations
- Crop stages
- Labour efficiency
- Material utilization
- Crop health
- Incidents
- Agronomy actions
- Location-based farm performance

This creates the foundation for Agaate's future **Farm Intelligence & AI Agronomy Engine**.