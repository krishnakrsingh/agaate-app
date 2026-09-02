# Agaate Design System v1.0

Agaate is a line-first agricultural operations interface. The visual system treats the product as a field instrument rather than a generic SaaS dashboard: strong typography, precise horizontal and vertical rules, disciplined grids, restrained agricultural color, dense operational information where useful, and clear action hierarchy. The interface feels calm, durable, technical, and built for real work.

## Design Principles
- **Primary**: Lines before cards
- **Secondary**: Hierarchy before decoration
- **Interaction**: Action before ornament
- **Density**: Dense when operational, spacious when orienting
- **Surfaces**: Flat by default
- **Identity**: Agricultural, technical, human

---

## 1. Color Palette

| Token | Hex | Role / Usage |
|---|---|---|
| `ink` | `#171918` | Primary text, high-emphasis headers, primary dark buttons |
| `ink-soft` | `#303532` | Secondary headers, strong borders, dark rules |
| `green` | `#24543A` | Primary agricultural brand accent, active state rules, primary green CTAs |
| `green-dark` | `#173B29` | Deep forest accent, interactive hover states, text actions |
| `green-light` | `#EAF1EA` | Selected rows, callout background, active plot highlights |
| `paper` | `#FAFAF7` | Base application background |
| `canvas` | `#FFFFFF` | Form inputs, dropdown menus, modal content background |
| `stone` | `#F1F1EC` | Table row hover, subtle secondary container fill |
| `line` | `#D7DAD5` | Hairline border (primary structural separator between rows/sections) |
| `line-strong` | `#AEB4AD` | Strong border, table headers bottom border, input borders |
| `muted` | `#737A74` | Secondary text, timestamps, helper descriptions |
| `subtle` | `#969D97` | Placeholder text, disabled labels |
| `amber` | `#9A6818` | Attention / Warning status markers and text |
| `amber-light` | `#F7F0DF` | Warning backgrounds and warning chips |
| `red` | `#A63B32` | Blocked / Error / Critical status and alerts |
| `red-light` | `#F8EAE7` | Error backgrounds and alert chips |
| `blue` | `#315F86` | Information signals, focus ring indicator (`2px solid #315F86`) |
| `blue-light` | `#EAF0F5` | Info banners and informative chips |
| `focus` | `#315F86` | 2px accessible focus ring |
| `on-dark` | `#FFFFFF` | Text on dark buttons or badges |

---

## 2. Typography

| Role | Font Family | Size | Weight | Line Height | Letter Spacing | Transform |
|---|---|---|---|---|---|---|
| **display** | `Inter`, sans-serif | clamp(42px, 5vw, 76px) | 400 | 0.98 | -0.045em | normal |
| **page-title** | `Inter`, sans-serif | clamp(32px, 3.5vw, 52px) | 450 | 1.05 | -0.035em | normal |
| **section-title**| `Inter`, sans-serif | 28px | 450 | 1.15 | -0.025em | normal |
| **item-title** | `Inter`, sans-serif | 18px | 500 | 1.30 | -0.010em | normal |
| **body** | `Inter`, sans-serif | 15px | 400 | 1.50 | 0 | normal |
| **body-large** | `Inter`, sans-serif | 17px | 400 | 1.50 | 0 | normal |
| **label** | `IBM Plex Mono`, monospace | 11px | 500 | 1.30 | +0.080em | UPPERCASE |
| **data** | `IBM Plex Mono`, monospace | 13px | 400 | 1.40 | +0.010em | normal |
| **button** | `Inter`, sans-serif | 14px | 550 | 1.00 | -0.005em | normal |

---

## 3. Spacing, Radii, Borders, and Elevation

### Spacing Scale
- `base` / `xs`: `4px`
- `sm`: `8px`
- `md`: `12px`
- `lg`: `16px`
- `xl`: `24px`
- `xxl`: `32px`
- `section`: `48px`
- `section-large`: `80px`

### Border Radii
- `none`: `0px` (Callouts, full-width dividers)
- `xs`: `2px` (Inputs, textareas, selects, precision tags)
- `sm`: `4px` (Buttons, compact cards, dialog containers, badges)
- `md`: `8px` (Select panels)
- `pill`: `999px` (Strictly reserved for round micro-indicators)

### Borders
- `hairline`: `1px solid #D7DAD5` (Primary structural row and section separator)
- `strong`: `1px solid #AEB4AD` (Input resting state, table header underline)
- `dark`: `1px solid #303532` (High-contrast separation)
- `accent`: `2px solid #24543A` (Active route indicator, selected plot boundary, callout accent)

### Shadows
- `default`: `none` (Flat by default)
- `elevated`: `0 8px 24px rgba(23, 25, 24, 0.08)` (Dropdown menus)
- `modal`: `0 16px 48px rgba(23, 25, 24, 0.14)` (Dialog overlays)

---

## 4. Visual Language & Structural Rules

1. **Line-first Architecture**: Use borders and rules to establish structure before using containers.
   - Horizontal rules: Primary structural separator between rows, sections, and data.
   - Vertical rules: Used selectively to divide columns and operational fields.
   - Accent rule: A 2px green rule identifies the active route or important state.
2. **Flatness**: No shadows or floating containers unless elevation communicates a real interaction layer (dialogs, dropdowns).
3. **Corners**: Square (`0px`) or lightly rounded (`2px` / `4px`) geometry. Large rounded cards are prohibited as a default pattern.
4. **Whitespace**: Separates hierarchy; does not decorate empty space.
5. **Operational Density**: Operational screens are information-dense, with disciplined reading order and clear scanability.
6. **Status System**: Always combine shape/color with explicit text.
   - **Complete**: Solid green marker + "Complete"
   - **Active**: Green outline or filled green + "Active"
   - **Pending**: Hollow gray marker + "Pending"
   - **Attention**: Amber marker + "Needs attention"
   - **Blocked**: Red marker + "Blocked"

---

## 5. Navigation & Layout

- **Layout Shell**: `maxWidth: 1440px`, desktop gutter `40px`, tablet gutter `24px`, mobile gutter `16px`, grid gap `24px`.
- **Desktop Navigation**: `64px` height, 3 zones (brand mark, primary links, user profile/switcher). Active link uses dark text with a `2px` green bottom rule, never a filled pill.
- **Mobile Navigation**: `56px` height, fixed bottom dock with 44px+ touch targets and clear active indicators.
- **Orientation Dashboard**: Orientation surface, not a wall of KPI cards. Large telemetry figures with mono labels and dividing rules.
- **Operational Tables**: First-class tables with uppercase mono headers (`11px`), strong header border, hairline row borders, hover feedback (`#F1F1EC`).
- **Work-Order Forms**: Grouped with section rules and mono labels instead of nested card boxes. 44px minimum input heights.
