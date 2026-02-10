import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

// Run Prisma deploy migrations during build, but only when DATABASE_URL is present.
// This keeps local `npm run build` usable even if you haven't configured a DB.
const url = process.env.DATABASE_URL;
if (!url) {
  console.log("[db:deploy] DATABASE_URL not set, skipping prisma generate/migrate deploy");
  process.exit(0);
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", ...opts });
  return r;
}

function listMigrationDirs() {
  const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
  if (!fs.existsSync(migrationsDir)) return [];
  return fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

// 1) prisma generate
{
  const r = run("npx", ["prisma", "generate"], { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

// 2) Try migrate deploy first (preferred; preserves migration history)
{
  const r = run("npx", ["prisma", "migrate", "deploy"], { stdio: "inherit" });
  if (r.status === 0) {
    console.log("[db:deploy] prisma migrate deploy completed");
    process.exit(0);
  }

  console.warn("[db:deploy] prisma migrate deploy failed; attempting bootstrap for fresh DB");
}

// 3) Bootstrap for a fresh database (when baseline migrations are missing).
//    We push the current schema, then mark existing migrations as applied so future deploys can proceed.
{
  const r = run("npx", ["prisma", "db", "push", "--accept-data-loss", "--skip-generate"], {
    stdio: "inherit",
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

const dirs = listMigrationDirs();
for (const dir of dirs) {
  const r = run("npx", ["prisma", "migrate", "resolve", "--applied", dir], { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log("[db:deploy] bootstrap completed (db push + resolve applied migrations)");
