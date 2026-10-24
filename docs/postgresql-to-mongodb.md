# PostgreSQL to MongoDB data migration notes

The SQL migrations in packages/database/migrations are retained as a record of the previous schema. The active API no longer imports pg, runs SQL migrations, or connects to PostgreSQL. No destructive SQL operation or automatic copy is performed.

Existing PostgreSQL accounts and records are not yet transferred. If there is data to preserve, perform a separate migration against a verified source and a dedicated MongoDB destination:

1. Back up the PostgreSQL database and verify the backup.
2. Create a new MongoDB database and take a destination backup policy before importing.
3. Export and transform users/settings first, preserving normalized email, password hashes only if their format is compatible with the current bcrypt verifier, timezone, and account ids as migration references.
4. Transform each user's Study, Fitness, and Islamic records into the Mongoose document shapes, preserving dates in the user's IANA timezone and all user ownership links.
5. Import in dependency order and validate document counts, unique email constraints, references, and per-user totals.
6. Test login and representative reads using a non-production account before switching MONGODB_URI.

Do not run a bulk import into a production database without a dry run and verified backups. The current app does not include an importer because the source database and a verified migration mapping were not available during this task.
