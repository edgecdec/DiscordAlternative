const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
const bcrypt = require("bcryptjs");
const path = require("node:path");

const BCRYPT_ROUNDS = 10;
const DB_PATH = path.join(process.cwd(), "data", "discord.db");

const USERS = [
  { username: "testbot", password: "testpass123" },
  { username: "ralphbot", password: "ralphpass123" },
];

async function main() {
  const adapter = new PrismaBetterSqlite3({ url: `file:${DB_PATH}` });
  const prisma = new PrismaClient({ adapter });

  for (const { username, password } of USERS) {
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      console.log(`User '${username}' already exists, skipping.`);
      continue;
    }
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await prisma.user.create({ data: { username, passwordHash } });
    console.log(`Created user '${username}'.`);
  }

  await prisma.$disconnect();
  console.log("Seed complete.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
