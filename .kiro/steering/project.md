---
inclusion: always
---

# Project: Tweak

Tweak is a local services / gig marketplace. Users post short jobs ("tweaks" — e.g. plumbing,
electrical, cleaning, moving, painting, writing, design, coding), other users apply, the two
sides negotiate a price (quote / counter-quote), the job is scheduled and completed, money moves
through an in-app wallet, and both sides rate each other. An admin web panel moderates users,
tweaks and payouts.

## Monorepo

```
tweak/ (repo root)
├── backend/   FastAPI API + Postgres        → only backend work writes here (+ docker-compose.yml)
├── admin/     React admin/moderation panel   → only admin work writes here
├── mobile/    Expo (React Native) app        → only mobile work writes here
├── packages/theme/  @tweak/theme design tokens (colours, spacing, radii, type) → the ONLY shared code; tokens only, no logic
├── .kiro/     Kiro config (source of truth for all rules)
└── docker-compose.yml, package.json (npm workspaces: admin, mobile)
```

- A task touches one app unless it is explicitly cross-cutting. Cross-app changes go through the
  API contract (`api-guidelines.md`), never through shared code. The only shared code is
  `@tweak/theme` (`packages/theme/`): admin maps it to Tailwind via CSS variables; mobile reads it
  through `ThemeProvider`/`useTheme`. Change colours there, never as hex in components.
- Personas per app live in the Kiro agents (`.kiro/agents/*.json`) / skills.

## Core domain objects

| Object | Meaning |
|---|---|
| **User** | Can act as both a lister (posts tweaks) and a provider (applies to tweaks). Has profile, skills, rating, wallet. |
| **Tweak** | A posted job: category, description, media (images/audio), location, schedule, pricing model, status (`draft`/`active`/`closed`). |
| **Application** | A provider applying to a tweak, with a "why", a quoted price, and chosen time slots; status `pending`/`accepted`/`rejected`. |
| **Offer / counter-quote** | Lister can counter an applicant's quoted price; negotiation until accepted. |
| **Wallet / transaction** | In-app balance, top-ups, payouts, holds/escrow for an accepted tweak. |
| **Refund** | Reversal of a tweak payment under the refund policy. |
| **Rating** | Post-completion rating in both directions (lister↔provider). |
| **Address** | Saved user locations used for in-person tweaks. |
| **Invite / referral** | Referral codes (feature-flagged). |

## Key business rules (enforced in backend `services/`, mirrored in UI)

- A provider cannot apply to their own tweak.
- Only `active` tweaks are discoverable in the marketplace; `draft` is private to its owner.
- Accepting an application places a hold on the lister's wallet for the agreed amount; releasing
  on completion or refunding on cancellation are explicit state transitions, never ad hoc updates.
- A tweak with any accepted application cannot be hard-deleted; it is closed instead.
- Ratings are only allowed after a tweak reaches a completed state, once per side.
