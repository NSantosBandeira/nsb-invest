import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { PrismaClient } = require("../src/generated/prisma/client.ts");

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });

const email = "teste-docker@test.com";

try {
  await db.user.deleteMany({ where: { email } });
  const hash = await bcrypt.hash("senha123", 12);
  const user = await db.user.create({
    data: { name: "Teste", email, password: hash },
  });
  console.log("USER CREATED", user.id);
  const ok = await bcrypt.compare("senha123", user.password);
  console.log("BCRYPT OK", ok);
} catch (e) {
  console.error("ERROR", e);
  process.exit(1);
} finally {
  await db.$disconnect();
  await pool.end();
}
