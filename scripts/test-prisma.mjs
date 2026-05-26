import { createRequire } from "module";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const require = createRequire(import.meta.url);
const { PrismaClient } = require("../src/generated/prisma/client.ts");

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });

try {
  const count = await db.user.count();
  console.log("PRISMA OK, users:", count);
} catch (e) {
  console.error("PRISMA FAIL:", e);
  process.exit(1);
} finally {
  await db.$disconnect();
  await pool.end();
}
