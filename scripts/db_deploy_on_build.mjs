import { spawnSync } from "child_process";

// Run Prisma deploy migrations during build, but only when DATABASE_URL is present.
// This keeps local `npm run build` usable even if you haven't configured a DB.
const url = process.env.DATABASE_URL;
if (!url) {
  console.log("[db:deploy] DATABASE_URL not set, skipping prisma generate/migrate deploy");
  process.exit(0);
}

// prisma generate
{
  const r = spawnSync("npx", ["prisma", "generate"], { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

// migrate deploy (no shadow database required)
{
  const r = spawnSync("npx", ["prisma", "migrate", "deploy"], { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log("[db:deploy] prisma migrate deploy completed");

