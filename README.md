# Care Guide Task API

A secure notes API built with NestJS and MongoDB Atlas.

- JWT access tokens and refresh tokens (in an httpOnly cookie), with rotation
- Passwords hashed with argon2
- Two roles: `USER` and `ADMIN`
- Notes (private to their author), posts (public to logged-in users) and admin user management
- Pagination on every list
- Two MongoDB aggregations: users grouped by interest, and a user's posts with `$lookup`
- Only the indexes that a query needs

## Tech

NestJS 12, Mongoose 9, MongoDB Atlas, Node 24, Yarn 4, Swagger, oxlint, Prettier.

## Setup

### 1. Requirements

- Node 24 (see `.nvmrc`). With nvm: `nvm use`.
- Yarn 4, through Corepack: `corepack enable`.
- A MongoDB Atlas cluster.

### 2. MongoDB Atlas

1. Create a free cluster.
2. Under **Database Access**, add a database user with a strong password.
3. Under **Network Access**, add your own IP address.
4. Click **Connect > Drivers** and copy the `mongodb+srv://...` connection string.
5. Add the database name at the end of the string, for example `.../care-guide-task`.

The app creates the collections and indexes the first time it starts.

### 3. Environment variables

Copy the example file and fill it in:

```bash
cp .env.example .env
```

| Variable                 | Required | Default                 | What it is                                                   |
| ------------------------ | -------- | ----------------------- | ------------------------------------------------------------ |
| `NODE_ENV`               | No       | `development`           | `development`, `test` or `production`                        |
| `PORT`                   | No       | `5000`                  | Port the API listens on                                      |
| `MONGODB_URI`            | Yes      |                         | Atlas connection string, ending with the database name       |
| `JWT_ACCESS_SECRET`      | Yes      |                         | Secret for access tokens, at least 32 characters             |
| `JWT_REFRESH_SECRET`     | Yes      |                         | Secret for refresh tokens, at least 32 characters, different |
| `JWT_ACCESS_EXPIRES_IN`  | No       | `900`                   | Access token lifetime in seconds (15 minutes)                |
| `JWT_REFRESH_EXPIRES_IN` | No       | `604800`                | Refresh token lifetime in seconds (7 days)                   |
| `WEB_ORIGIN`             | No       | `http://localhost:5001` | Frontend origin, allowed by CORS to send the refresh cookie  |

Generate each secret with:

```bash
openssl rand -base64 48
```

The app checks these on startup and stops with a clear message if one is missing or wrong.

### 4. Install and run

```bash
yarn install
```

```bash
yarn start:dev
```

- API: `http://localhost:5000/api`
- Swagger: `http://localhost:5000/api/docs`

### 5. Seed the admin and dummy data

```bash
yarn db:seed
```

This creates:

- one admin user
- 20 dummy users with different interests, each with 1 to 3 notes and 1 to 2 posts (39 notes and 30 posts in total)

Running it again adds nothing. The dummy users, notes and posts are saved in one transaction, so either all of them are saved or none.

| User name | Email               | Password   |
| --------- | ------------------- | ---------- |
| `admin`   | `admin@example.com` | `12345678` |

Every dummy user has the password `12345678`, and the email `<userName>@example.com`, for example `rahim_uddin@example.com`.

Change the admin password after the first login.

## Scripts

| Script            | What it does                    |
| ----------------- | ------------------------------- |
| `yarn start:dev`  | Run with watch mode             |
| `yarn start`      | Run once                        |
| `yarn build`      | Build to `dist/`                |
| `yarn start:prod` | Run the build                   |
| `yarn db:seed`    | Create the admin and dummy data |
| `yarn lint`       | Lint with oxlint                |
| `yarn typecheck`  | Type check with `tsc`           |
| `yarn format`     | Format `src/` with Prettier     |

CI runs lint, typecheck and build on every push to `main` and every pull request. There are no automated tests.

## Auth

- `POST /api/auth/register` or `POST /api/auth/login` returns an access token in the body and sets a refresh token in an httpOnly cookie.
- Send the access token on every other request: `Authorization: Bearer <token>`.
- When the access token expires, call `POST /api/auth/refresh`. It sends back a new access token and a new refresh cookie. The old refresh token stops working.
- If an old refresh token is used again, every session of that user is ended.
- The role is read from the database on every request, so a role change works at once.

In Swagger, a successful register, login or refresh fills in the token for you.

## Endpoints

All paths start with `/api`. Lists take `page` (default 1) and `pageSize` (default 10) and return the items with a `total`.

**Roles:** Public = no token. Logged in = any user with a token. Admin = `ADMIN` role only.

### Auth

| Method | Path             | Role      | What it does                   |
| ------ | ---------------- | --------- | ------------------------------ |
| POST   | `/auth/register` | Public    | Register a new user            |
| POST   | `/auth/login`    | Public    | Log in with user name or email |
| POST   | `/auth/refresh`  | Public    | Get new tokens with the cookie |
| POST   | `/auth/logout`   | Public    | End this session               |
| GET    | `/auth/me`       | Logged in | Get the logged-in user         |

### Profile

| Method | Path                | Role      | What it does                                 |
| ------ | ------------------- | --------- | -------------------------------------------- |
| PATCH  | `/profile`          | Logged in | Update my user name, full name or email      |
| PATCH  | `/profile/password` | Logged in | Change my password and end my other sessions |

### Notes

| Method | Path         | Role      | What it does                                       |
| ------ | ------------ | --------- | -------------------------------------------------- |
| POST   | `/notes`     | Logged in | Create a note                                      |
| GET    | `/notes`     | Logged in | List my notes. `search` matches title or content   |
| GET    | `/notes/all` | Admin     | List every user's notes with the author. View only |
| GET    | `/notes/:id` | Logged in | Get one of my notes                                |
| PATCH  | `/notes/:id` | Logged in | Update one of my notes                             |
| DELETE | `/notes/:id` | Logged in | Delete one of my notes                             |

A note of another user returns 404, the same as a note that does not exist.

### Posts

| Method | Path                  | Role      | What it does                                                      |
| ------ | --------------------- | --------- | ----------------------------------------------------------------- |
| POST   | `/posts`              | Logged in | Create a post                                                     |
| GET    | `/posts`              | Logged in | List all posts with the author. `search` matches title or content |
| GET    | `/posts/user/:userId` | Logged in | One user's posts (**Aggregation 2**)                              |
| GET    | `/posts/:id`          | Logged in | Get a post                                                        |
| PATCH  | `/posts/:id`          | Logged in | Update a post. Author only, 403 for anyone else                   |
| DELETE | `/posts/:id`          | Logged in | Delete a post. Author only, 403 for anyone else                   |

### Users

| Method | Path               | Role  | What it does                                                 |
| ------ | ------------------ | ----- | ------------------------------------------------------------ |
| POST   | `/users`           | Admin | Create a user with a role and interests                      |
| GET    | `/users`           | Admin | List users. `search` and `role` filters                      |
| GET    | `/users/interests` | Admin | Users grouped by interest (**Aggregation 1**)                |
| GET    | `/users/:id`       | Admin | Get a user                                                   |
| PATCH  | `/users/:id`       | Admin | Update a user. An admin can't change their own role          |
| DELETE | `/users/:id`       | Admin | Delete a user with their notes, posts and sessions. Not self |

### Health

| Method | Path      | Role   | What it does                                  |
| ------ | --------- | ------ | --------------------------------------------- |
| GET    | `/health` | Public | 200 when MongoDB answers, 503 when it doesn't |

## Aggregations

**Aggregation 1, users grouped by interest** (`GET /api/users/interests`): one `users.aggregate()` call. It runs `$unwind` on `interests`, then `$group` by interest. Each group has its user count and one page of its users, newest first. The most popular interests come first. Interests are a fixed list: `MUSIC`, `TRAVEL`, `SPORTS`, `READING`, `MOVIES`.

**Aggregation 2, a user's posts** (`GET /api/posts/user/:userId`): one `users.aggregate()` pipeline. It finds the user with `$match`, then joins their posts with `$lookup` (`_id` → `posts.author`). Inside the lookup, `$sort` and `$facet` return one page of posts and the total count. The response is `{ user, total, posts }`.

## Indexes

Only indexes that a query needs exist. Each one was checked with `explain()`.

| Collection       | Index                     | Used by                                             |
| ---------------- | ------------------------- | --------------------------------------------------- |
| `users`          | `{ email: 1 }`, unique    | Register and login by email. Stops duplicate emails |
| `users`          | `{ userName: 1 }`, unique | Login by user name. Stops duplicate user names      |
| `refresh_tokens` | `{ expiresAt: 1 }`, TTL   | MongoDB deletes expired sessions in the background  |
| `notes`          | `{ author: 1, _id: -1 }`  | A user's notes, newest first, and their count       |
| `posts`          | `{ author: 1, _id: -1 }`  | The `$lookup` in Aggregation 2, newest first        |

Every other query uses the default `_id` index. See [docs/schema.md](docs/schema.md) for the full schema and the reason for each index.

## Security notes

- **Frontend role checks are only for convenience.** The frontend hides admin pages from normal users, but that is not security. The API checks the role on every request with `AuthGuard` and `RolesGuard`.
- Refresh tokens are stored as SHA-256 hashes, never as plain text.
- `passwordHash` is never returned by the API.
- Search input is escaped before it goes into a regex.
- A bad id returns 404, and unknown fields in a request body are rejected.

## Project structure

```
src/
  common/     shared constants, decorators, guards, pipes, types and utils
  config/     environment variable validation
  health/     health check
  infra/
    mongo/    Mongoose schemas and the global Mongo module
    token/    JWT and refresh token service
  modules/    auth, profile, notes, posts, users
  swagger/    Swagger UI helpers
scripts/      seed script and Node version check
docs/         database schema
```

## License

MIT
