# CANONICAL_DOMAIN_TERMS

| Canonical | Meaning | Owner module | DB | Notes |
|---|---|---|---|---|
| FARM | managed agricultural estate | `estates` | `Farm` | "Estate" is display vocabulary only. Never rename the model. |
| PLOT | subdivided field inside a farm | `estates` | `Plot` | "Field" = plot in UI copy; canonical is PLOT. |
| CROP CYCLE | one planting lifecycle on a plot | `cropping` | `CropCycle` | "Crop"/"season" in UI map here. Status: PLANNED/ACTIVE/… |
| TASK | unit of work (any origin) | `operations` | `Task` | "Work order"/"activity" = task. Origin: AGRONOMIST/SYSTEM/DAILY_MONITORING. |
| TASK EXECUTION | officer's completion record | `operations` | `TaskExecution` | One execution per task (`taskId @unique`). |
| WORKFORCE / PEOPLE | humans, not labour-hours | `organization` | `User` + `DailyCrewMuster` | "Worker/labour/crew" = User rows; counted hours = LabourUsage/Muster. |
| ATTENDANCE | daily presence claim + verdict | `attendance` | `Attendance` | Status OPEN/COMPLETED/EXCEPTION_*. Decision math owned by `spatial`. |
| INCIDENT | farm/plot/crop report | `incidents` | `Incident` | "Issue" in UI = incident. Follow-ups separate table. |
| MONITORING | crop health observation | `agronomy` | `CropMonitoring` | "Observation/scouting" = monitoring row. |
| PRESCRIPTION | agronomist's corrective recipe | `agronomy` | `AgronomyPrescription` | Always targets farm+plot+cycle. |
| BOUNDARY | canonical GeoJSON fence | `spatial` | `Farm/Plot.boundaryGeoJson` + `BoundaryVersion` | Null = unfenced (radius fallback), never "empty polygon". |
| WALK TRACK | GPS evidence for a boundary | `spatial` | `WalkTrack` (id = captureId) | Evidence, not relational data. |

If two terms mean the same thing, use the canonical one in new code and
note the alias above. If they differ, add a row — do not overload.
