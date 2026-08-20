import { PrismaClient } from "@prisma/client";

async function testConn(url, name) {
  const p = new PrismaClient({ datasources: { db: { url } } });
  try {
    await p.$connect();
    console.log(`✅ SUCCESS [${name}]: Connected!`);
    await p.$disconnect();
    return true;
  } catch (err) {
    console.error(`❌ FAIL [${name}]: ${err.message}`);
    await p.$disconnect();
    return false;
  }
}

async function main() {
  const pwd = encodeURIComponent("Hanif#260822");
  
  // Variant 1: Direct 5432
  await testConn(`postgresql://postgres:${pwd}@db.cvlhbiwyrtxzohszsohn.supabase.co:5432/postgres`, "Direct 5432");

  // Variant 2: Pooler 6543 (Session)
  await testConn(`postgresql://postgres.cvlhbiwyrtxzohszsohn:${pwd}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`, "Pooler 6543 (Session)");

  // Variant 3: Pooler 5432 (Transaction)
  await testConn(`postgresql://postgres.cvlhbiwyrtxzohszsohn:${pwd}@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`, "Pooler 5432 (Tx)");
}

main();
