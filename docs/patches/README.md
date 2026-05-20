# SQL patches

One-off, dated SQL scripts that bring an already-deployed database in line
with changes to `../phases/`. Each patch is also folded into the relevant
phase file, so a fresh database created from `../phases/` does not need to
apply patches — only existing deployments do.

## Naming

`YYYY-MM-DD-short-description.sql` — date is the day the patch was authored.

## Applying

Paste the file into the Supabase SQL Editor for the target project, or run
it through any tool that can talk to the database (`psql`, `supabase db
execute`, etc.). Every patch is idempotent: re-running it against a
database that's already current is a no-op.

## Index

| Patch | Summary |
| --- | --- |
| `2026-05-21-grant-public-rpcs-to-authenticated.sql` | Grant `submit_public_request` and `lookup_request_by_tracking_id` to `authenticated` so signed-in users can use `/submit` and `/track`. |
