# PostgreSQL Docker & TypeORM Integration Plan
# Target: AWS Aurora Serverless v2 (PostgreSQL-compatible) in production
# Local development: PostgreSQL via Docker Compose

overview:
  description: |
    Add PostgreSQL to docker-compose for local development and integrate TypeORM
    with NestJS following existing project patterns (ValkeyModule as reference).
  production_target: AWS Aurora Serverless v2 (PostgreSQL 15.x compatible)
  local_development: PostgreSQL 15 via Docker Compose

tasks:
  - id: 1
    title: Update docker-compose.yml with PostgreSQL service
    files:
      - docker-compose.yml
    changes:
      - Add postgres service using postgres:15-alpine image
      - Configure container name as thumbwar-postgres
      - Map port 5432:5432
      - Add named volume postgres_data for persistence
      - Configure healthcheck using pg_isready
      - Add to thumbwar-network
      - Set environment variables for POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
    example: |
      postgres:
        image: postgres:15-alpine
        container_name: thumbwar-postgres
        ports:
          - '5432:5432'
        environment:
          POSTGRES_USER: thumbwar
          POSTGRES_PASSWORD: thumbwar_local
          POSTGRES_DB: thumbwar
        volumes:
          - postgres_data:/var/lib/postgresql/data
        healthcheck:
          test: ['CMD-SHELL', 'pg_isready -U thumbwar -d thumbwar']
          interval: 10s
          timeout: 5s
          retries: 5
          start_period: 10s
        networks:
          - thumbwar-network
        restart: unless-stopped

  - id: 2
    title: Install TypeORM and PostgreSQL dependencies
    files:
      - package.json
    commands:
      - bun add @nestjs/typeorm typeorm pg
    dependencies:
      production:
        - '@nestjs/typeorm': '^10.0.2'
        - 'typeorm': '^0.3.20'
        - 'pg': '^8.13.1'

  - id: 3
    title: Create DatabaseModule following ValkeyModule pattern
    files:
      - src/database/database.module.ts
    pattern: |
      - Use @Global() decorator for app-wide availability
      - Use TypeOrmModule.forRootAsync() for async configuration
      - Read connection settings from environment variables
      - Configure for Aurora Serverless compatibility (SSL, connection pooling)
    example: |
      @Global()
      @Module({
        imports: [
          TypeOrmModule.forRootAsync({
            useFactory: () => ({
              type: 'postgres',
              host: process.env.DATABASE_HOST ?? 'localhost',
              port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
              username: process.env.DATABASE_USER ?? 'thumbwar',
              password: process.env.DATABASE_PASSWORD ?? 'thumbwar_local',
              database: process.env.DATABASE_NAME ?? 'thumbwar',
              entities: [],
              synchronize: false,
              ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
            }),
          }),
        ],
      })
      export class DatabaseModule {}

  - id: 4
    title: Create database configuration interface
    files:
      - src/database/database.interface.ts
    content: |
      - Define DatabaseConfig interface with all connection properties
      - Define constants for default values
      - Follow pattern from valkey.interface.ts

  - id: 5
    title: Update AppModule to import DatabaseModule
    files:
      - src/app.module.ts
    changes:
      - Import DatabaseModule
      - Add to imports array (order matters - before feature modules)

  - id: 6
    title: Add environment variables
    files:
      - .env.development
      - .env.example (create if not exists)
    variables:
      - DATABASE_HOST=localhost
      - DATABASE_PORT=5432
      - DATABASE_USER=thumbwar
      - DATABASE_PASSWORD=thumbwar_local
      - DATABASE_NAME=thumbwar
      - DATABASE_SSL=false
    production_notes: |
      For Aurora Serverless, use:
      - DATABASE_HOST from AWS Secrets Manager or SSM Parameter Store
      - DATABASE_SSL=true for secure connections
      - Consider using IAM database authentication

  - id: 7
    title: Configure TypeORM CLI for migrations
    files:
      - typeorm.config.ts (create at project root)
      - package.json (add migration scripts)
    scripts:
      - 'migration:generate': 'typeorm-ts-node-commonjs migration:generate -d typeorm.config.ts'
      - 'migration:run': 'typeorm-ts-node-commonjs migration:run -d typeorm.config.ts'
      - 'migration:revert': 'typeorm-ts-node-commonjs migration:revert -d typeorm.config.ts'
    config_example: |
      import { DataSource } from 'typeorm';

      export default new DataSource({
        type: 'postgres',
        host: process.env.DATABASE_HOST ?? 'localhost',
        port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
        username: process.env.DATABASE_USER ?? 'thumbwar',
        password: process.env.DATABASE_PASSWORD ?? 'thumbwar_local',
        database: process.env.DATABASE_NAME ?? 'thumbwar',
        entities: ['src/**/*.entity.ts'],
        migrations: ['src/database/migrations/*.ts'],
        synchronize: false,
      });

  - id: 8
    title: Create migrations directory structure
    files:
      - src/database/migrations/.keep
    notes: |
      Migrations will be generated using TypeORM CLI per PROJECT_RULES.md:
      "Never create or modify a typeorm migration file directly.
       Instead use migration:generate from package.json."

  - id: 9
    title: Create example entity pattern documentation
    files:
      - src/database/entities/.keep
    pattern: |
      Entities should follow this structure:
      - Place in feature module directory (e.g., src/user/user.entity.ts)
      - Use class-validator decorators for validation
      - Use class-transformer for serialization
      - Register in DatabaseModule entities array or use autoLoadEntities

  - id: 10
    title: Update serverless.yml for Aurora connection
    files:
      - serverless.yml
    changes:
      - Add VPC configuration for Lambda to access Aurora
      - Add security group configuration
      - Add environment variables from SSM/Secrets Manager
    notes: |
      Aurora Serverless v2 requires:
      - Lambda in same VPC as Aurora cluster
      - Security group allowing PostgreSQL port (5432)
      - Consider RDS Proxy for connection pooling in serverless

  - id: 11
    title: Add health check for database connection
    files:
      - src/health/health.module.ts
      - src/health/health.resolver.ts (or controller)
    changes:
      - Add TypeORM health indicator
      - Include database connectivity in health check endpoint

verification:
  local_testing:
    - Run "docker compose up -d" to start PostgreSQL and Valkey
    - Run "bun run migration:run" to apply migrations
    - Run "bun run start:local" to start NestJS
    - Verify database connection in logs
    - Test health check endpoint

  checklist:
    - PostgreSQL container starts and passes health check
    - NestJS connects to PostgreSQL on startup
    - Migrations can be generated and run
    - Health check includes database status
    - Environment variables properly loaded

dependencies_between_tasks:
  - task 2 must complete before tasks 3-11
  - task 3 must complete before task 5
  - task 7 must complete before task 8
  - tasks 1, 2, 6 can run in parallel

estimated_files_to_create:
  - src/database/database.module.ts
  - src/database/database.interface.ts
  - src/database/migrations/.keep
  - typeorm.config.ts

estimated_files_to_modify:
  - docker-compose.yml
  - package.json
  - src/app.module.ts
  - .env.development
  - serverless.yml
  - src/health/health.module.ts
