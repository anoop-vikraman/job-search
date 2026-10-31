# Chat

In-app messaging between a tweak's **lister** and the **accepted provider**. There is exactly one
conversation per application; it opens when the application is accepted.

## Rules (enforced in `services/chat_service.py`)

- Only the two parties can open, read or write a conversation. Anyone else gets
  `403 CONVERSATION_ACCESS_DENIED`; unknown ids get `404 CONVERSATION_NOT_FOUND`.
- A conversation can be created only while the application is `accepted` or `completed`
  (`409 CHAT_NOT_AVAILABLE` otherwise). Opening is idempotent: `POST /conversations` returns
  `201` the first time and `200` with the same conversation afterwards.
- Sending is allowed while the application is `accepted` or `completed`. After the lister cancels
  the work (application becomes `withdrawn`) the thread is read-only: `can_send` is `false` and
  sending returns `409 CHAT_CLOSED`. History stays readable.
- Message bodies are trimmed and must be 1–2000 characters (`422 VALIDATION_ERROR` for blank).
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

## Endpoints

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/conversations?page&limit` | Caller's conversations, most recently active first, each with `other_user`, `last_message`, `unread_count`, `can_send`, `my_role` |
| POST | `/api/v1/conversations` | `{ application_id }` → get-or-create (201/200) |
| GET | `/api/v1/conversations/unread-count` | `{ count }` across all conversations |
| GET | `/api/v1/conversations/{id}` | One conversation |
| GET | `/api/v1/conversations/{id}/messages?page&limit` | Newest first (`limit` ≤ 100, default 50) |
| POST | `/api/v1/conversations/{id}/messages` | `{ body }` → 201 message |
| POST | `/api/v1/conversations/{id}/read` | Mark read |

## Mobile

- **Entry points**: "Message Provider" / "Message Lister" button on the tweak detail screen
  (`app/tweaks/[id].tsx`) when an accepted/completed application exists; a chat icon in the
  applicant screen header (`app/tweaks/[id]/applicants/[userId].tsx`); a chat icon with an unread
  badge in the home header (`components/Home/HomeHeader.tsx`) that opens the list.
- **Screens**: `app/chat/index.tsx` (conversation list) and `app/chat/[id].tsx` (thread, inverted
  list, composer). The bottom tab bar is hidden inside a thread.
- **Freshness**: TanStack Query polling while the screen is focused: thread every 4 s, list every
  15 s, header badge every 30 s (`hooks/useChat.ts`). A sent message is inserted into the cache
  immediately; the thread marks itself read when a new incoming message appears while visible.

## Data

- `conversations`: `application_id` (unique), `tweak_id`, `lister_user_id`, `provider_user_id`,
  the two read cursors, `last_message_at`.
- `messages`: `conversation_id`, `sender_user_id`, `body` (CHECK 1–2000 chars), `created_at`.

## Key files
- Backend: `app/models/chat.py`, `app/schemas/chat.py`, `app/services/chat_service.py`,
  `app/api/v1/conversations.py`, migration `2fecf0efc7ef`
- Mobile: `api/chat.ts`, `hooks/useChat.ts`, `app/chat/*`, `components/Chat/ChatAvatar.tsx`
