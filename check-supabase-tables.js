import { PrismaClient } from "@prisma/client";

async function main() {
  const p = new PrismaClient({
    datasources: {
      db: {
        url: "postgresql://postgres.cvlhbiwyrtxzohszsohn:Hanif%23260822@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres",
      },
    },
  });

  try {
    console.log("Checking tables in Supabase...");
    const tables = await p.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log("SUCCESS! Tables currently in Supabase:", tables);
  } catch (err) {
    console.error("ERROR:", err.message);
  } finally {
    await p.$disconnect();
  }
}

main();
