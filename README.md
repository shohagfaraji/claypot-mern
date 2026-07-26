# Claypot

Claypot is a full-stack recipe-sharing platform for discovering, creating, and organizing
home-cooked recipes.

## Project status

Claypot is in active development. The repository is currently being established with a
maintainable foundation before product features are introduced.

## Technology

- **Client:** React, Vite, TypeScript, Tailwind CSS, and shadcn/ui
- **Server:** Node.js, Express, and TypeScript
- **Database:** MongoDB with Mongoose
- **Testing:** Vitest and Supertest
- **Code quality:** ESLint and Prettier

## Repository structure

```text
claypot-mern/
├── client/     # React web application
├── server/     # Express REST API
└── README.md
```

## Local development

### Requirements

- Node.js 22
- npm 9 or newer

Install the current development dependencies:

```bash
npm install
```

Create the server environment file:

```bash
cp server/.env.example server/.env
```

Start the client and API together:

```bash
npm run dev
```

The client runs at `http://localhost:5173` and the API runs at `http://localhost:5000`.
Individual workspaces can also be started with `npm run dev:client` or `npm run dev:server`.

Run the test suite:

```bash
npm test
```

Create a production build:

```bash
npm run build
```

Check formatting:

```bash
npm run format:check
```

Run the available lint checks:

```bash
npm run lint
```
