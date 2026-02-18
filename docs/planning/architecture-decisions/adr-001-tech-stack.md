# ADR 001: Technology Stack Selection

## Status
Accepted

## Date
2026-02-13

## Context
We need to select a technology stack for a self-hosted personal budgeting application that will run in Docker on Unraid. The application requires:

- High security (encryption, 2FA, passkeys)
- Offline-first capabilities with sync
- Responsive web interface (future mobile app wrapping)
- SimpleFIN Bridge integration for bank data
- Budget forecasting and debt tracking
- Self-hosted deployment

## Decision

### Backend
**Node.js 20 with TypeScript and Express.js**

**Rationale:**
- TypeScript provides type safety and excellent developer experience
- Express.js is mature, well-documented, and has extensive ecosystem
- Node.js has excellent async I/O for handling SimpleFIN API calls
- Strong library support for encryption (crypto), authentication (passport, @simplewebauthn), and database access
- Easy to containerize and deploy

**Alternatives Considered:**
- **Python/Flask**: Good for data processing, but TypeScript provides better type safety for complex financial calculations
- **Go**: Excellent performance but smaller ecosystem for rapid development
- **.NET Core**: Excellent but heavier Docker images and less familiar to team

### Database
**MariaDB 11 with InnoDB Encryption**

**Rationale:**
- ACID compliance critical for financial data
- Built-in transparent table encryption (InnoDB encryption)
- Excellent performance for transactional workloads
- Mature replication and backup tools
- Open source with active development
- Lower resource usage than PostgreSQL on Unraid

**Alternatives Considered:**
- **PostgreSQL**: More features (better JSON support) but higher resource usage
- **MongoDB**: Not suitable for financial transactions requiring ACID guarantees
- **SQLite**: Not suitable for multi-user future or concurrent access

### Caching/Sessions
**Redis**

**Rationale:**
- Fast in-memory storage for sessions and 2FA codes
- Simple persistence for session durability across restarts
- Low resource usage
- Built-in expiration for time-sensitive data (2FA codes, rate limiting)

**Alternatives Considered:**
- **In-memory sessions**: Would lose sessions on container restart
- **Database sessions**: Slower, adds unnecessary load to database

### Frontend Framework
**React 18 with TypeScript**

**Rationale:**
- User has experience with React (faster development)
- Largest ecosystem for component libraries
- Excellent PWA support via Vite plugins
- React Query provides robust offline-first patterns
- Easy to wrap as mobile app with React Native or Capacitor
- Strong community and tooling support

**Alternatives Considered:**
- **Vue**: Simpler learning curve but smaller ecosystem
- **Angular**: Too opinionated and heavy for this use case

### Build Tool
**Vite**

**Rationale:**
- Lightning-fast HMR for development productivity
- Native ESM support
- Excellent TypeScript support
- Built-in PWA plugin
- Smaller bundle sizes than webpack
- Better than deprecated Create React App

**Alternatives Considered:**
- **Webpack**: Slower build times, more complex configuration
- **Parcel**: Less mature ecosystem

### State Management
**Zustand + TanStack Query (React Query)**

**Rationale:**
- **Zustand** for client state: Simple API, minimal boilerplate, TypeScript-first
- **TanStack Query** for server state: Industry standard, built-in caching, offline support, optimistic updates
- Clear separation of concerns between client and server state
- No Redux boilerplate or complexity

**Alternatives Considered:**
- **Redux**: Too much boilerplate for this project size
- **Context API only**: No built-in caching or async state management

### UI Framework
**Tailwind CSS + Shadcn/ui**

**Rationale:**
- **Tailwind**: Utility-first, excellent for responsive design, small bundle size
- **Shadcn/ui**: Copy-paste components (no dependency lock-in), built on Radix UI (accessible), full customization
- Mobile-first by default
- No vendor lock-in
- Excellent dark mode support

**Alternatives Considered:**
- **Material-UI**: Heavier bundle size, harder to customize
- **Chakra UI**: Dependency lock-in
- **Custom CSS**: Too time-consuming to build from scratch

### Forms
**React Hook Form + Zod**

**Rationale:**
- React Hook Form: Best performance (uncontrolled), minimal re-renders
- Zod: TypeScript-first validation, can share schemas with backend
- Native integration between libraries
- Excellent TypeScript inference

**Alternatives Considered:**
- **Formik**: Slower performance with controlled components
- **Joi**: Not TypeScript-first

### Charts
**Recharts**

**Rationale:**
- Built on D3, declarative API
- Responsive by default
- Good TypeScript support
- Suitable for financial charts and forecasting
- Smaller bundle than full D3

**Alternatives Considered:**
- **Chart.js**: Less declarative, harder to integrate with React
- **D3 directly**: Steeper learning curve, larger bundle

### Offline Storage
**IndexedDB via Dexie.js + Web Crypto API**

**Rationale:**
- IndexedDB: Large storage capacity (50MB+), structured queries, transactions
- Dexie.js: Clean API, excellent TypeScript support
- Web Crypto API: Native encryption, no external dependencies
- React Query persistence plugin for seamless sync

**Alternatives Considered:**
- **LocalStorage**: Too limited (5-10MB), no transactions
- **External crypto library**: Adds bundle size, Web Crypto is sufficient

### Authentication
**JWT + Argon2id + WebAuthn**

**Rationale:**
- **JWT**: Stateless, easy to scale, works well with Docker
- **Argon2id**: Winner of Password Hashing Competition, resistant to side-channel attacks
- **WebAuthn**: Modern, phishing-resistant, excellent UX
- Industry best practices

**Alternatives Considered:**
- **Session-based auth**: Requires sticky sessions, harder to scale
- **bcrypt**: Argon2id is more resistant to GPU cracking
- **Auth0/Firebase**: Not suitable for self-hosted requirement

### Encryption
**AES-256-GCM**

**Rationale:**
- Industry standard authenticated encryption
- Fast (hardware-accelerated on modern CPUs)
- Prevents tampering (authenticated)
- Built-in support in Node.js crypto and Web Crypto API

**Alternatives Considered:**
- **AES-256-CBC**: No authentication tag (vulnerable to tampering)
- **ChaCha20-Poly1305**: Less hardware acceleration support

### Containerization
**Docker with Multi-Container Architecture**

**Rationale:**
- Separation of concerns (frontend, backend, database, redis)
- Independent scaling and updates
- Security isolation
- Easy rollback
- Unraid has excellent Docker support

**Alternatives Considered:**
- **Single container**: Less flexible, harder to update components independently
- **Kubernetes**: Overkill for single-server deployment

## Consequences

### Positive
- Modern, maintainable stack with strong typing throughout
- Excellent security foundations
- Good offline-first support
- Easy to deploy and maintain on Unraid
- Familiar technologies (React, Express) enable faster development
- Strong ecosystem support for all choices

### Negative
- JavaScript/TypeScript ecosystem can have frequent dependency updates
- Multiple technologies to maintain (Node.js, MariaDB, Redis, React)
- Offline-first with encryption adds complexity

### Risks
- **Dependency vulnerabilities**: Mitigated by automated security scanning and regular updates
- **Performance at scale**: Current architecture should handle single-user or small household easily; can optimize later if needed
- **Offline sync conflicts**: Mitigated by clear conflict resolution UI and last-write-wins strategy

## References
- [React Documentation](https://react.dev/)
- [Express.js Documentation](https://expressjs.com/)
- [MariaDB Encryption Documentation](https://mariadb.com/kb/en/data-at-rest-encryption/)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [Argon2 RFC](https://datatracker.ietf.org/doc/html/rfc9106)
- [WebAuthn Specification](https://www.w3.org/TR/webauthn-2/)
