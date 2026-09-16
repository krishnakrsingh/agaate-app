# Clients Directory — Design Notes

Scope: the Super Admin / HQ Clients screen at `/hq/clients`, rendered by
`src/components/hq/client-directory.tsx`. This documents the layout, tokens, and
interaction rules for that screen. It is not a platform-wide design system doc.

## Problem

The previous screen was a filter form with a table bolted underneath. It spent
most of the vertical space on six stacked, full-width controls (search, state,
status, sort, Save View, preset pills) before showing a single client. The page
answered "how do I filter?" before "who are my clients?".

## Goal

Make the screen a client-list management surface. A user should land on it and
immediately see the client count, status spread, locations, and farm counts, and
have one obvious way to open a client or add one.

## Information architecture

Reading order, top to bottom:

1. Header — page title, one-line purpose, primary action.
2. Toolbar — search and filters in a single horizontal row.
3. Active filter chips — only when a filter is applied.
4. Bulk action bar — only when rows are selected.
5. Result count — one muted line.
6. Client list — table on desktop, cards on mobile.
7. Pagination — only when there is more than one page.

Filters never occupy permanent vertical space, and destructive/bulk actions only
appear in context.

## Layout

### Header

```
Clients                                        [+ Add Client]
Manage clients, farms and their operations.
```

- Title: 26px, weight 700, `-0.02em` tracking, `color: var(--ink)`.
- Subtitle: 13px, `color: var(--muted)`.
- `Add Client` is a primary button (`btn btn-primary btn-sm`) linking to the
  existing `/hq/onboarding/new`. It renders only when the session holds
  `onboarding:manage`.

### Toolbar

One row on desktop: `[search] [State] [Status] [More filters] ......... Sort: [select]`.

- Search: flexible width, max 340px, magnifier icon, inline clear button.
- State: native input with a `<datalist>` of states. Keeps free text while
  offering suggestions, and maps to the API's `state` contains-match. No new
  API parameter.
- Status: native `<select>` — All / Active / Inactive / Suspended.
- More filters: popover (see below).
- Sort: right-aligned, label plus `<select>` — Name A–Z, Most farms, Most acreage,
  Recently active.

Controls use `height: 36px`, 13px text, `--radius-md`. They do not stretch to
fill the row.

### More filters popover

Holds the quick views that used to be permanent pills:

- All clients
- Largest active (status Active, sort acreage)
- Inactive
- Suspended
- Reset all filters (only when a filter is active)

The popover renders over a fixed transparent backdrop that closes it on outside
click. `Escape` closes it too.

### Active filter chips

Shown only when `search`, `state`, or `status` is not at its default:

```
[ State: Haryana × ]  [ Status: Active × ]   Clear all
```

Each chip clears its own filter; `Clear all` resets every filter, search, and
sort-dependent preset.

### Bulk action bar

Shown only when rows are selected. Set active / Set inactive plus clear
selection. Capped at 50 rows, matching the existing API limit. Rendered only
when the session holds `clients:write`.

## Client list

### Columns

| Column | Content |
| --- | --- |
| (checkbox) | Row selection for bulk status updates |
| Client | Business/client name (company name when present, otherwise account name) as a link; account name as a sub-line when it differs; client code in muted mono below |
| Contact | Contact name (only when distinct from the client name) and mobile number as a `tel:` link |
| Location | `District, State` |
| Farms | Farm count as a link to `/hq/farms?clientId={id}`, acreage in muted text below |
| Status | `● Active` / `● Inactive` / `● Suspended` |
| Last Activity | Relative time, full timestamp on hover |
| Actions | Three-dot menu |

The table lives in a white card (`--surface-card`) with a hairline border,
`--radius-lg`, and the flat shadow tier. The header row uses `--canvas-soft`
with 10.5px uppercase muted labels. Rows use hairline-soft dividers, a
`--canvas-soft` hover fill, and a pointer cursor.

### Status

Status is a dot plus text, colored by state — never color alone:

| Status | Token |
| --- | --- |
| Active | `--green-ink` |
| Inactive | `--red` |
| Suspended | `--amber` |

### Row actions menu

Three-dot menu per row. Items:

- View details → `/hq/clients/{id}`
- Edit client → `/hq/onboarding/new?clientId={id}` (only with `onboarding:manage`)
- Add farm → `/hq/onboarding/new?clientId={id}` (only with `onboarding:manage`)
- More actions: copy client code; set active/inactive (only with `clients:write`)

The status update reuses the existing single-item `PATCH /api/hq/clients` path
with a one-element `ids` array.

## Filters and search

- Search covers name, phone, client code, and business name via the existing
  `search` parameter, debounced at 250ms.
- State is debounced at 400ms.
- `More filters` quick views set `status` and `sort` combinations.
- Sort maps to the existing `sortBy` values.

No query parameter, endpoint, or response shape changed.

## Responsive behavior

| Width | Behavior |
| --- | --- |
| > 1080px | Full table, all columns |
| ≤ 1080px | Last Activity column hidden |
| ≤ 860px | Table replaced by client cards; a `Filters (n)` toggle reveals state/status/more-filters; search goes full width; sort goes full width; Add Client stays in the header |

Each mobile card carries the same data as a row: checkbox, name, status,
code, location, contact, farms link, last activity, and the same actions menu.

## States

- Loading: table row and card placeholder with a spinner and "Loading clients…".
- Error: "Couldn't load clients", the message, and a Retry button.
- Empty: "No clients found" / "Try changing your search or filters." plus Clear
  all when a filter is active.
- Populated: the table/card list with count and pagination.

## Tokens

The screen uses existing variables only. No new tokens.

- Surfaces: `--surface-card`, `--canvas-floor`, `--canvas-soft`, `--surface-strong`
- Lines: `--hairline`, `--hairline-soft`, `--hairline-strong`
- Text: `--ink`, `--body`, `--muted`, `--muted-soft`
- Status: `--green-ink`, `--red`, `--amber`
- Radii: `--radius-xs`, `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-pill`
- Elevation: `--shadow-subtle` (cards), `--shadow-elevated` (popovers)

No saturated CTA color; the primary action uses the dark ink pill.

## Accessibility and interaction

- Rows are clickable (`router.push`) and the client name is a real link, so
  keyboard users have a focusable target.
- Nested interactive cells (checkbox, phone, farms link, actions) stop
  propagation so row clicks do not fire.
- The actions and More filters buttons set `aria-haspopup`, `aria-expanded`, and
  `aria-label`; menus use `role="menu"` / `role="menuitem"` and close on
  `Escape` or outside click.
- Inputs keep the platform focus ring from `.input-field`.
- Selection checkboxes carry `aria-label`s.

## Permissions

The page passes two flags from the session:

- `onboarding:manage` → Add Client, Edit client, Add farm.
- `clients:write` → bulk bar and per-row status actions.

View access still requires `clients:read`; the server check is unchanged.

## Files

- `src/components/hq/client-directory.tsx` — screen rewrite.
- `src/app/hq/clients/page.tsx` — passes permission flags; header moved into the
  component.
- `src/components/icons.tsx` — added `MoreVertical` and `SlidersHorizontal`.
- `src/app/globals.css` — scoped `.client-*` styles.

## Not changed

- APIs: `GET` / `PATCH /api/hq/clients`.
- Routes: `/hq/clients`, `/hq/clients/[clientId]`, `/hq/onboarding/new`.
- Data model, audit logging, and permission checks.
- The legacy `--paper` / `--canvas` / `--green` alias layer.

## Removed

- The full-width state input and the separate status/sort rows.
- The permanent quick-view pills (moved into More filters).
- Save View and its `localStorage` keys (`hq-client-views-v1`). It was the only
  consumer and no other screen reads those views.

## Verified

- `npm run build` compiles `/hq/clients`.
- `tsc --noEmit` clean.
- `eslint` clean on the changed files.
