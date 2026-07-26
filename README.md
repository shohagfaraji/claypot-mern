# Claypot

Claypot is a full-stack recipe-sharing platform for discovering, creating, and organizing
home-cooked recipes.

## Project status

Claypot is in active development. The repository is currently being established with a
maintainable foundation before the client and API features are introduced.

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
├── server/     # Express REST API (planned)
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

Start the client development server:

```bash
npm run dev:client
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

Server setup instructions will be added when the API is introduced.
