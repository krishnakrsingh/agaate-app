# UI BEFORE → AFTER (checkpoint 4)

## Routes (URLs byte-stable — groups don't affect URLs)

```
BEFORE                          AFTER
app/hq/**                   →   app/(control)/hq/**
app/admin/**                →   app/(control)/admin/**
app/agronomy/**             →   app/(control)/agronomy/**
app/owner/**                →   app/(estate)/owner/**
app/officer/**              →   app/(field)/officer/**
app/{farms,plots,tasks,…}   →   UNCHANGED (cross-workspace shared screens;
                                forcing them into one group would lie)
app/api/**                  →   UNCHANGED (transport)
app/{work,directory,         →   UNCHANGED (3-line legacy redirect shims,
  insights}/page.tsx              bookmark compat — see debt list)
```

Alias pages (kept, flagged): `(estate)/owner/plots` re-exports `…/land`,
`(estate)/owner/team` re-exports `…/people`. Cross-page imports updated to
group paths; the shared logic inside those pages moves to modules later.

## Components (110+ files → domain homes)

```
components/{admin,hq,owner,officer,ops,agronomy,map,calendar}/**
    ↓ (git mv, history preserved)
modules/{spatial,operations,attendance,cropping,incidents,agronomy,
         harvest,inventory,expenses,estates,people,reporting,
         audit,onboarding}/ui/<same filename>

components/{nav,navbar,layout/desktop-sidebar,breadcrumbs,brand-logo}
    ↓
components/navigation/*

KEPT in components/: ui/*, layout/* (rest), data/*, icons,
theme-*, photo-upload-zone (shared capture primitive).
```

Filenames kept kebab-case (137/137 consistent — documented deviation from
the brief's PascalCase example). No export renames, no logic edits.

## Navigation

Single home `components/navigation/` (config + navbar + sidebar +
breadcrumbs + palette + switcher + profile + brand). `nav/config.ts`
content untouched (already permission-aware); split by workspace deferred
— one file, 209 lines, no duplication to kill yet.
