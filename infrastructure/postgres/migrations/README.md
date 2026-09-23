# Database migrations

`schema.sql` initializes a new database. SQL files in this directory are incremental migrations for existing volumes.

Run migrations against the configured PostgreSQL database before deploying application code that depends on a newer schema.
