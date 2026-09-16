# ADR-003 — Spatial stays pure and monopolistic

- Status: accepted. Date: 2026-09-16.
- Context: geo-core/attendance-geo/track/geo-versions already form a single,
  tested, documented pipeline. Only discovered risk: future duplicate
  implementations (second haversine, second containment).
- Decision: `modules/spatial` owns ALL geometry math + geofence decisions +
  walk cleaning + versioned writes. Pure files stay framework-free forever
  (arch-tested). `geo-versions.commitBoundary` is the only write path.
- Rejected: splitting spatial per consumer (farms/plots/attendance copies).
- Consequences: area/geofence bugs get fixed once, at the source.
