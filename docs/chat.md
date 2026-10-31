# Chat

In-app messaging between a tweak's **lister** and a **provider**. There is exactly one
conversation per application. It fully opens when the application is accepted; before that the
lister can start it to ask the applicant a few questions.

## Rules (enforced in `services/chat_service.py`)

- Only the two parties can open, read or write a conversation. Anyone else gets
  `403 CONVERSATION_ACCESS_DENIED`; unknown ids get `404 CONVERSATION_NOT_FOUND`.
- Either party can open the conversation once the application is `accepted`, `completed` or
  `disputed`. While it is `pending`, only the **lister** can open it (`409 CHAT_NOT_AVAILABLE`
  otherwise). Opening is idempotent: `POST /conversations` returns `201` the first time and `200`
  with the same conversation afterwards.
- **Before acceptance** each side may send `CHAT_PRE_ACCEPT_LIMIT` messages (default 3,
  `409 PRE_ACCEPT_LIMIT` after that). `pre_accept_remaining` tells the caller how many are left;
  it becomes `null` once the application is accepted and the cap no longer applies.
- After acceptance sending is allowed while the application is `accepted`, `disputed` or
  `completed`. After the lister cancels the work (`withdrawn`) the thread is read-only:
  `can_send` is `false` and sending returns `409 CHAT_CLOSED`. A block between the two users also
  makes it read-only ([reports-and-blocking.md](./reports-and-blocking.md)). History stays readable.
- A message is `{ body, attachment_urls[] }`: text up to 2000 characters (trimmed) and/or up to
  4 photos uploaded via `POST /media/upload`. Attachments must be `/media/...` URLs from this API.
  An empty message is `422 VALIDATION_ERROR`. Photo-only notifications read "📷 Photo".
- Every message creates a `new_message` notification for the recipient (title
  "New message from {first name}", body = first 120 characters).

## Unread tracking

Each conversation stores a read cursor per party (`lister_last_read_at`, `provider_last_read_at`).
A message is unread for you when the other party sent it after your cursor.

- Sending a message moves your own cursor to that message (replying implies you read the thread).
- `POST /conversations/{id}/read` moves your cursor to the latest message and marks that tweak's
  `new_message` notifications as read.
- Message timestamps use the application clock and are forced to be strictly increasing within a
  conversation, so ordering and cursors stay correct for rapid messages.
- **Read receipts**: each conversation includes `other_last_read_at` (the other party's cursor).
  The app shows "Seen" under your newest message once that time passes it.

## Real-time updates

`GET /api/v1/ws` (WebSocket). After connecting, send `{"type":"auth","token":"<access token>"}`
within 10 s; the server replies `{"type":"ready"}`, then pushes
`{"type":"message"|"read","conversation_id"}`. `{"type":"ping"}` → `{"type":"pong"}`. A bad token
closes with code 4401. The token goes in the first frame, not the URL, to keep it out of logs.

Events are published with Postgres `pg_notify` inside the same transaction as the message or read,
so they are delivered only on commit and reach every API process: each process runs a `LISTEN`
connection (`services/realtime_service.py`, started in the app lifespan) and forwards events to its
own sockets. Events carry ids only; the app refetches through the normal authorized endpoints.
`REALTIME_ENABLED=false` turns it off.

## Endpoints

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/conversations?page&limit` | Caller's conversations, most recently active first, each with `other_user`, `last_message`, `unread_count`, `can_send`, `my_role` |
| POST | `/api/v1/conversations` | `{ application_id }` → get-or-create (201/200) |
| GET | `/api/v1/conversations/unread-count` | `{ count }` across all conversations |
| GET | `/api/v1/conversations/{id}` | One conversation |
| GET | `/api/v1/conversations/{id}/messages?page&limit` | Newest first (`limit` ≤ 100, default 50) |
| POST | `/api/v1/conversations/{id}/messages` | `{ body, attachment_urls[] }` → 201 message |
| WS | `/api/v1/ws` | Real-time events (see above) |
| POST | `/api/v1/conversations/{id}/read` | Mark read |

## Mobile

- **Entry points**: "Message Provider" / "Message Lister" button on the tweak detail screen
  (`app/tweaks/[id].tsx`) when an accepted/completed application exists; a chat icon in the
  applicant screen header (`app/tweaks/[id]/applicants/[userId].tsx`); a chat icon with an unread
  badge in the home header (`components/Home/HomeHeader.tsx`) that opens the list.
- **Screens**: `app/chat/index.tsx` (conversation list) and `app/chat/[id].tsx` (thread, inverted
  list, composer). The bottom tab bar is hidden inside a thread.
- **Freshness**: `hooks/useRealtime.ts` (mounted in `app/_layout.tsx`) keeps the socket open while
  signed in and in the foreground, reconnecting with backoff, and refetches the affected queries on
  each event. While it is connected, focused screens poll only every 60 s as a safety net; when it's
  down they fall back to polling (thread 4 s, list 15 s, badge 30 s). A sent message is inserted
  into the cache immediately; the thread marks itself read when a new incoming message appears.
- **Photos**: the image button uploads up to 4 photos (`utils/mediaUpload.ts`) and sends them with
  the text. Long-press a received message to report it.
- The applicant screen's chat icon also appears for **pending** applicants (lister questions).

## Data

- `conversations`: `application_id` (unique), `tweak_id`, `lister_user_id`, `provider_user_id`,
  the two read cursors, `last_message_at`.
- `messages`: `conversation_id`, `sender_user_id`, `body` (≤ 2000 chars; may be empty only with
  photos), `attachments` (JSONB array), `created_at`.

## Key files
- Backend: `app/models/chat.py`, `app/schemas/chat.py`, `app/services/chat_service.py`,
  `app/api/v1/conversations.py`, migration `2fecf0efc7ef`
- Mobile: `api/chat.ts`, `hooks/useChat.ts`, `app/chat/*`, `components/Chat/ChatAvatar.tsx`
