// Local development only. On a user machine the platform applies
// db/migrations/*.sql itself, in filename order, on every start.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const dir = join(process.cwd(), "db", "migrations");
const files = readdirSync(dir).filter((name) => name.endsWith(".sql")).sort();
const sql = postgres(connectionString, { max: 1 });

for (const file of files) {
  console.log(`applying ${file}`);
  await sql.unsafe(readFileSync(join(dir, file), "utf8"));
}

await sql.end();
console.log(`applied ${files.length} migration file(s)`);
