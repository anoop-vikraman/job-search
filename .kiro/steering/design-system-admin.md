---
inclusion: fileMatch
fileMatchPattern: 'admin/**'
---

# Admin Design System

## Paradigm
- Desktop-first; scale down responsively, not up.
- High data density: compact spacing, small type scale, minimal decorative whitespace.
- Dashboard-focused layouts (sidebar nav + content panes).

## Tokens & Theme
- Foundation: neutral zinc/slate monochrome.
- Primary: `#2563EB` (Tailwind `blue-600`). Use for primary actions, focus rings, active states only.
- Define colors as CSS variables (Shadcn theme tokens) sourced from `@tweak/theme`; no hard-coded
  hex in components.
- Dark mode: full support via Tailwind `dark:` classes on every surface, border, and text style.

## Status colours (shared vocabulary with mobile)
| Domain state | Foreground | Surface (light) |
|---|---|---|
| Active / accepted / completed | `#16A34A` (green-600) | `#DCFCE7` (green-100) |
| Rejected / cancelled / banned | `#DC2626` (red-600) | `#FEE2E2` (red-100) |
| Pending / on hold / in review | `#D97706` (amber-600) | `#FEF3C7` (amber-100) |
| Draft / closed / inactive | zinc-500 | zinc-100 |

- Dark mode uses the 950-level surfaces. Never signal state by colour alone; pair with a label/icon.

## Typography
- Sans: `Inter`, falling back to `system-ui, sans-serif`.
- Monospace (`font-mono`) for:
  - tweak IDs / user IDs / transaction IDs
  - token logs
  - timestamps and currency amounts in ledger views

## Tables & Grids (TanStack Table)
Every data table (users, tweaks, applications, transactions, refunds) must include:
- sticky header
- pagination
- column visibility toggle
- row-level quick actions (e.g. dropdown menu per row)

## Form Elements
- Explicit floating labels on all inputs; no placeholder-only labels.
- Inline Zod error messages below the field, linked via `aria-describedby`.
- Loading state: submit control disabled + spinner; prevent double submit.
