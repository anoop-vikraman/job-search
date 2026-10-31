# Reports & blocking

## Blocking

A block works both ways. If either user blocked the other:

- neither sees the other's tweaks in the feed;
- neither can apply to the other's tweaks (`403 USER_BLOCKED`);
- neither can open a new chat or send messages to the other (`403 USER_BLOCKED`); existing
  conversations stay readable with `blocked: true` and `can_send: false`.

| Method | Path | Notes |
|---|---|---|
| POST | `/api/v1/users/{user_id}/block` | Idempotent; `400 CANNOT_BLOCK_SELF`, `404 USER_NOT_FOUND` |
| DELETE | `/api/v1/users/{user_id}/block` | Idempotent, 204 |
| GET | `/api/v1/users/me/blocks` | `[{ user, blocked_at }]` |

Mobile: Block/Unblock in the chat screen's ⋮ menu; **Blocked Users** screen in the profile menu
(`app/settings/blocked.tsx`).

## Reports

`POST /api/v1/reports` `{ target_type: user|tweak|message, target_id, reason, details? }`
— reasons: `spam`, `scam`, `harassment`, `inappropriate`, `no_show`, `other`.

- The backend records `target_user_id` (the user, the tweak's owner, or the message's sender).
- Messages can only be reported by the two parties of that conversation; otherwise the target is
  reported as not found.
- One open report per reporter per target (`409 ALREADY_REPORTED`); you can't report yourself or
  your own content (`400 CANNOT_REPORT_SELF`).

Mobile: tweak screen ⋮ → **Report**; chat ⋮ → **Report {name}**; long-press a received message
→ report that message (`components/Moderation/ReportSheet.tsx`). The tweak menu's **Support**
item now opens the Help screen.

### Admin

- `GET /admin/reports?status&target_type&page&limit` — newest first, each with
  `open_reports_against_user` to spot repeat offenders.
- `POST /admin/reports/{id}/resolve` `{ action: actioned|dismissed, note?, ban_user?, close_tweak? }`
  — `ban_user` bans `target_user_id`; `close_tweak` closes an active/draft tweak target. Resolving
  settles **every** open report on the same target.
- Admin panel **Reports** page: Dismiss / Close tweak / Ban user.

Tables: `reports` (partial unique index on open reports per reporter+target), `blocks`
(unique pair, no self-block). Migration `33fad82f3d29`.
