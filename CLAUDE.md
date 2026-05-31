# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Core Development Commands

- **Start the application**: `bun start`
- **Development mode (watch)**: `bun dev`
- **Run tests**: `bun run test` (uses Vitest)
- **Run specific test project**:
  - Unit tests: `bun run test -- --project=unit`
  - Integration tests: `bun run test -- --project=integration`
- **Run tests with watch**: `bun run test -- --watch`
- **Run tests with UI**: `bun run test -- --ui`

### Linting and Formatting

- **Run linter**: `bun run lint` (uses oxlint)
- **Fix lint issues**: `bun run lint:fix`
- **Format code**: `bun run fmt` (uses oxfmt)
- **Check formatting**: `bun run fmt:check`

### Database

- **Generate Prisma client**: `bunx prisma generate`
- **Apply database schema**: `bunx prisma db push` (use `--accept-data-loss` in development)
- **Create migration**: `bunx prisma migrate dev`

### Type Checking

- **Type check with TypeScript**: `bun run tsc`

## Codebase Architecture

### Technology Stack

- **Runtime**: Bun (JavaScript/TypeScript runtime)
- **Framework**: Hono (web framework)
- **Database**: PostgreSQL with Prisma ORM
- **GraphQL**: GraphQL-Yoga (via Hono integration)
- **Validation**: Zod for request validation
- **Testing**: Vitest (unit and integration tests)
- **Logging**: Pino with pretty printing
- **Authentication**: JWT/OIDC with Keycloak

### Directory Structure

```
/src
  ├── /admin              # Admin routes (health checks)
  ├── /config            # Configuration files
  │   ├── /cors           # CORS settings
  │   ├── /dev            # Development routes
  │   ├── /resources      # Resources (TLS, SQL files)
  │   ├── env.mts         # Environment variables
  │   ├── paths.mts       # Route paths
  │   └── server.mts      # Server configuration
  │
  ├── /generated         # Generated Prisma client
  │   └── /prisma
  │
  ├── /logger            # Logging utilities
  │   ├── banner.mts      # ASCII banner
  │   ├── logger.mts      # Logger configuration
  │   ├── request-logger.mts
  │   └── response-time.mts
  │
  ├── /parkhaus          # Main business logic
  │   ├── /router         # Route handlers
  │   ├── /service        # Business logic
  │   │   ├── errors.mts  # Custom errors
  │   │   └── *.service.mts
  │   └── /dto            # Data transfer objects
  │
  ├── /security          # Authentication and security
  │   ├── auth-router.mts # Auth routes
  │   └── errors.mts      # Security errors
  │
  ├── app.mts            # Main Hono application
  ├── container.mts      # Dependency injection
  ├── index.mts          # Entry point
  └── problem-details.mts # Error problem details

/prisma
  └── schema.prisma      # Database schema
```

### Key Components

1. **Application Structure**: 
   - Uses Hono as the web framework with middleware for CORS, compression, and security headers
   - Modular routing structure with separate routers for different concerns
   - Error handling middleware with custom error classes

2. **Database**:
   - PostgreSQL with Prisma ORM
   - Database connection managed in `prisma-client.mts`
   - Schema defines Parkhaus (parking garage), Auto (car), and Adresse (address) models
   - Uses database population service for initial data setup

3. **Testing**:
   - Vitest configured with separate projects for unit and integration tests
   - Global setup for integration tests
   - Test files located in `src/*/service/*.test.mts` for unit tests
   - Integration tests in `test/integration/` directory

4. **Configuration**:
   - Environment variables managed in `env.mts`
   - Server configuration in `server.mts` (ports, TLS)
   - Paths configuration in `paths.mts`

5. **CI/CD**:
   - GitHub Actions workflows for:
     - CI (build, test, lint)
     - Docker image building and publishing
     - Linting and type checking
   - Uses PostgreSQL service in CI for testing

## Key Patterns

1. **Error Handling**:
   - Custom error classes extending Error
   - Problem details responses following standards
   - Zod validation errors handled consistently

2. **Testing**:
   - Separate test configurations for unit and integration tests
   - Test files colocated with service files
   - Global setup/teardown for integration tests

3. **Authentication**:
   - JWT-based authentication via auth-router
   - Role-based access control patterns

4. **Database Population**:
   - Initial data populated via `container.dbPopulateService`
   - CSV import for test data

## Important Notes

- The application uses **Bun** as the runtime, not Node.js
- File extension conventions: `.mts` for TypeScript modules, `.ts` for generated files
- Development mode runs on HTTP (portHttp) with HTTPS for production
- TLS configuration required for HTTPS
- Database connection via Prisma with environment variable configuration
- Codebase is TypeScript-first with strict type checking