# Care Guide API

- **Frontend:** https://care-guide-by-apu-emdad.netlify.app
- **Swagger docs:** https://16-178-61-240.sslip.io/api/docs

> [!TIP]
> **No need to copy tokens in Swagger.** After you register or log in, Swagger fills in the access token for you. When it expires, Swagger refreshes it and sends your request again.

## Tech

NestJS 12, Mongoose 9, MongoDB Atlas, Node 24, Swagger.

## Features

- **Auth:** JWT based. The access token lasts 15 minutes and the refresh token lasts 7 days. The refresh token is sent in an httpOnly cookie and changes on every refresh. Passwords are hashed with argon2.
- **Roles:** two roles, `ADMIN` and `USER`. A `RolesGuard` blocks routes that a role can't use.
  - **User:**
    - Create, update, delete and list their own notes
    - Create posts, and update or delete their own
    - See everyone's posts, or one user's posts (`$lookup` aggregation)
    - Update their profile and password
  - **Admin:**
    - Everything a user can do
    - Add, update, delete and list users
    - See everyone's notes
    - See users grouped by interest (`$group` aggregation)
- **Pagination:** on every list.
- **Indexes:** only the ones a query needs.

## Deployment

- **Server:** AWS EC2 `t3.micro`, Ubuntu, in Sydney (`ap-southeast-2`), with an Elastic IP.
- **Nginx:** reverse proxy that sends `/api/` to the app.
- **HTTPS:** Let's Encrypt certificate from Certbot, on an `sslip.io` domain that points to the Elastic IP.
- **Database:** MongoDB Atlas free cluster (M0), also in Sydney, close to the server.
- **CI/CD:** GitHub Actions. `ci.yml` runs lint, typecheck and build. After CI passes on `main`, `deploy.yml` connects over SSH, pulls the code, builds it, restarts PM2 and checks `/api/health`.

## Project structure

```
.github/
  workflows/
    ci.yml      lint, typecheck and build on every push to main and every pull request
    deploy.yml  deploy to EC2 after CI passes on main
scripts/      seed (admin and dummy data) and Node version check
src/
  common/     shared constants, decorators, guards, pipes, filters, interceptors, types and utils
  config/     environment variable validation
  health/     health check
  infra/
    mongo/    Mongoose schemas and the global Mongo module
    token/    JWT and refresh token service
  modules/    auth, profile, notes, posts, users
  swagger/    Swagger UI helpers
```

## Endpoints

### Auth

| Method | Path             | What it does                   |
| ------ | ---------------- | ------------------------------ |
| POST   | `/auth/register` | Register a new user            |
| POST   | `/auth/login`    | Log in with user name or email |
| POST   | `/auth/refresh`  | Get new tokens with the cookie |
| POST   | `/auth/logout`   | End this session               |
| GET    | `/auth/me`       | Get the logged-in user         |

### Profile

| Method | Path                | What it does                                 |
| ------ | ------------------- | -------------------------------------------- |
| PATCH  | `/profile`          | Update my user name, full name or email      |
| PATCH  | `/profile/password` | Change my password and end my other sessions |

### Notes

| Method | Path         | What it does                                       |
| ------ | ------------ | -------------------------------------------------- |
| POST   | `/notes`     | Create a note                                      |
| GET    | `/notes`     | List my notes. `search` matches title or content   |
| GET    | `/notes/all` | List every user's notes with the author. View only |
| GET    | `/notes/:id` | Get one of my notes                                |
| PATCH  | `/notes/:id` | Update one of my notes                             |
| DELETE | `/notes/:id` | Delete one of my notes                             |

### Posts

| Method | Path                  | What it does                                                      |
| ------ | --------------------- | ----------------------------------------------------------------- |
| POST   | `/posts`              | Create a post                                                     |
| GET    | `/posts`              | List all posts with the author. `search` matches title or content |
| GET    | `/posts/user/:userId` | One user's posts (**Aggregation 2**)                              |
| GET    | `/posts/:id`          | Get a post                                                        |
| PATCH  | `/posts/:id`          | Update a post. Author only, 403 for anyone else                   |
| DELETE | `/posts/:id`          | Delete a post. Author only, 403 for anyone else                   |

### Users

| Method | Path               | What it does                                                 |
| ------ | ------------------ | ------------------------------------------------------------ |
| POST   | `/users`           | Create a user with a role and interests                      |
| GET    | `/users`           | List users. `search`, `role` and `interest` filters          |
| GET    | `/users/interests` | Users grouped by interest (**Aggregation 1**)                |
| GET    | `/users/:id`       | Get a user                                                   |
| PATCH  | `/users/:id`       | Update a user. An admin can't change their own role          |
| DELETE | `/users/:id`       | Delete a user with their notes, posts and sessions. Not self |

### Health

| Method | Path      | What it does                                  |
| ------ | --------- | --------------------------------------------- |
| GET    | `/health` | 200 when MongoDB answers, 503 when it doesn't |

## Setup

### 1. Requirements

- Node 24 (see `.nvmrc`). With nvm: `nvm use`.
- Yarn 4, through Corepack: `corepack enable`.
- A MongoDB Atlas cluster.

### 2. Environment variables

Copy the example file and fill it in:

```bash
cp .env.example .env
```

### 3. Install and run

```bash
yarn install
```

```bash
yarn start:dev
```

> [!IMPORTANT]
> **Open Swagger to try the API:** `http://localhost:5000/api/docs`
>
> API base URL: `http://localhost:5000/api`

### 4. Seed dummy data

```bash
yarn db:seed
```

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

## License

[MIT](LICENSE) © Emdadul Haque Apu
