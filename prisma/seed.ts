import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const stocks = [
    { code: "1301", name: "極洋", targetYield: 3.5, sector: "水産・農林業" },
    { code: "2914", name: "JT", targetYield: 4.5, sector: "食料品" },
    { code: "8058", name: "三菱商事", targetYield: 3.8, sector: "卸売業" },
    { code: "8316", name: "三井住友FG", targetYield: 4.0, sector: "銀行業" },
    { code: "9437", name: "NTTドコモ系監視用サンプル", targetYield: 3.6, sector: "情報・通信業" }
  ];

  for (const stock of stocks) {
    await prisma.stock.upsert({
      where: { code: stock.code },
      update: stock,
      create: stock
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
