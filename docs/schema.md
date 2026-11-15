# Database Schema

MongoDB (Atlas), with Mongoose. The schemas are in `src/infra/mongo/schemas/`. Every index is defined with `schema.index`, in the same file as its schema.

## Collections

```mermaid
erDiagram
    users ||--o{ notes : "author"
    users ||--o{ posts : "author"
    users ||--o{ refresh_tokens : "userId"
```

### `users`

| Field          | Type       | Notes                                                                                                   |
| -------------- | ---------- | ------------------------------------------------------------------------------------------------------- |
| `_id`          | `ObjectId` | Primary key                                                                                             |
| `userName`     | `string`   | Required, lower case, unique                                                                            |
| `fullName`     | `string`   | Required                                                                                                |
| `email`        | `string`   | Required, lower case, unique                                                                            |
| `passwordHash` | `string`   | Required, argon2 hash. Hidden from queries                                                              |
| `role`         | `string`   | `USER` (default) or `ADMIN`                                                                             |
| `interests`    | `string[]` | Default empty. Each one of MUSIC, TRAVEL, SPORTS, READING, MOVIES. Grouped by the interests aggregation |
| `createdAt`    | `Date`     | Set by Mongoose                                                                                         |
| `updatedAt`    | `Date`     | Set by Mongoose                                                                                         |

### `refresh_tokens`

One document per session.

| Field       | Type       | Notes                                                  |
| ----------- | ---------- | ------------------------------------------------------ |
| `_id`       | `string`   | The session id. It goes inside the refresh token       |
| `userId`    | `ObjectId` | Required, the user the session belongs to              |
| `tokenHash` | `string`   | Required, SHA-256 hash of the token. Never the token   |
| `expiresAt` | `Date`     | Required. MongoDB deletes the document after this time |
| `createdAt` | `Date`     | Set by Mongoose                                        |

### `notes`

| Field       | Type       | Notes               |
| ----------- | ---------- | ------------------- |
| `_id`       | `ObjectId` | Primary key         |
| `author`    | `ObjectId` | Required, the user  |
| `title`     | `string`   | Required, max 200   |
| `content`   | `string`   | Required, max 10000 |
| `createdAt` | `Date`     | Set by Mongoose     |
| `updatedAt` | `Date`     | Set by Mongoose     |

### `posts`

| Field       | Type       | Notes               |
| ----------- | ---------- | ------------------- |
| `_id`       | `ObjectId` | Primary key         |
| `author`    | `ObjectId` | Required, the user  |
| `title`     | `string`   | Required, max 200   |
| `content`   | `string`   | Required, max 10000 |
| `createdAt` | `Date`     | Set by Mongoose     |
| `updatedAt` | `Date`     | Set by Mongoose     |

## Indexes

Only indexes that a query needs exist. There are 5, all defined with `schema.index`. Besides these, every collection has the default `_id` index.

Each index below was checked with `explain()`: the listed queries use it (`IXSCAN`).

| Collection       | Index                       | Used by                                                                                                                |
| ---------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `users`          | `{ email: 1 }`, unique      | Register and login by email. Unique stops two users having the same email                                              |
| `users`          | `{ userName: 1 }`, unique   | Login by user name. Unique stops two users having the same user name                                                   |
| `refresh_tokens` | `{ expiresAt: 1 }`, TTL 0 s | No query. MongoDB uses it in the background to delete expired sessions                                                 |
| `notes`          | `{ author: 1, _id: -1 }`    | A user's notes, newest first, with and without search. Their count. Deleting a user's notes when the user is deleted   |
| `posts`          | `{ author: 1, _id: -1 }`    | The `$lookup` from users in the user posts aggregation, newest first. Deleting a user's posts when the user is deleted |

### Queries that use the default `_id` index

- **Get by id**: a user (also the auth guard on every request), a post, a session on refresh.
- **Get, update or delete one note**: `{ _id, author }` finds the note by `_id`, then checks `author`.
- **Lists sorted newest first**: admin users list, admin notes list, posts list. They sort by `_id` and page with `skip` and `limit`.
- **Users grouped by interests**: one aggregation over every user (`$unwind` and `$group`). It must read all users, so an index on `interests` would not help.
- **The user in the user posts aggregation**: the first `$match` on `_id`.

### Queries with no index

- **End all sessions of a user** (`deleteMany({ userId })`): a collection scan. It runs rarely (password change, reused token, user delete), and the TTL index keeps `refresh_tokens` small. An index on `userId` would slow every login and refresh for little gain.
