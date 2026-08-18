require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const insights = await prisma.aiInsight.findMany({
    where: { userId: 'cmsu5jwfw000201lo5zlbk3e8' },
  });
  console.log(JSON.stringify(insights, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
