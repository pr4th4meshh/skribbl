# skribbl - pribbl

A real-time multiplayer drawing and guessing game — draw a word, watch your friends guess it, and climb the leaderboard.

![Game Screenshot](https://raw.githubusercontent.com/pr4th4meshh/skribbl/main/client/public/preview.png)

## Features

- **Real-time multiplayer** — draw and guess with friends in the same room
- **Guest play** — join and play without an account; create a room as a guest
- **Drawing tools** — pen (thin / medium / thick), eraser, flood fill, undo, clear
- **Live word hints** — letters reveal progressively as time runs out
- **Scoring** — points awarded based on how quickly you guess; drawer earns bonus points
- **Leaderboard** — persistent stats across games (wins, total score, games played)
- **Public & private rooms** — browse open rooms or share a code with friends
- **Player avatars** — auto-generated identicons per player
- **Mobile responsive** — playable on phones and tablets

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS 4, shadcn/ui |
| Backend | Node.js, Express 5, Socket.IO 4 |
| Database | PostgreSQL via Prisma 7 |
| Cache / Pub-Sub | Redis (ioredis, Socket.IO redis-adapter) |
| Job queue | BullMQ (game timers, word reveals) |
| Auth | JWT (access + refresh tokens), Argon2 |
| Validation | Zod (shared between client & server) |
| Monorepo | npm workspaces |

## Project Structure

```
skribbl/
├── client/          # React/Vite frontend
├── server/          # Node/Express/Socket.IO backend
└── shared/          # @skribbl/shared — Zod schemas + typed socket events
```

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL
- Redis

### Install

```bash
git clone https://github.com/pr4th4meshh/skribbl.git
cd skribbl
npm install
```

### Environment

Copy the example env and fill in your values:

```bash
cp server/.env.example server/.env  # or create server/.env manually
```

```env
PORT=6969
DATABASE_URL=postgresql://user:password@localhost:5432/skribbl
REDIS_URL=redis://localhost:6379
JWT_SECRET=<random-64-char-string>
JWT_REFRESH_SECRET=<random-64-char-string>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000
```

For the client, create `client/.env`:

```env
VITE_API_URL=http://localhost:6969
VITE_SOCKET_URL=http://localhost:6969
```

### Database

```bash
cd server
npx prisma db push        # push schema to your DB
npx prisma generate       # generate Prisma client
```

### Run

```bash
# from repo root — start both client and server
npm run dev -w server     # backend on :6969
npm run dev -w client     # frontend on :3000
```

Or with Docker (Redis included):

```bash
cd server
docker compose -f docker-compose.yml build --no-cache
docker compose -f docker-compose.yml up
```

## Deployment

The live deployment uses:

| Service | Provider |
|---|---|
| Frontend | Vercel |
| Backend | Render |
| Database | Supabase (PostgreSQL) |
| Redis | Upstash |

## Game Flow

1. Create or join a room (authenticated or as a guest)
2. Host starts the game when enough players have joined
3. Each round, one player is chosen as the drawer and picks a word
4. The drawer has a time limit to draw the word on the canvas
5. Other players type guesses in the chat — correct guesses score points
6. Letter hints reveal gradually to help stuck players
7. Round ends when time runs out or everyone guesses correctly
8. Scores update after each round; winner is announced at the end

## Drawing Tools

| Tool | Description |
|---|---|
| Pen | Freehand drawing in three sizes (thin / medium / thick) |
| Eraser | Erase parts of the drawing |
| Fill | Flood-fill a region with the selected color |
| Undo | Step back one stroke at a time |
| Clear | Wipe the entire canvas |
