import { prisma } from "@/lib/prisma";

export async function getStocks(query?: string) {
  return prisma.stock.findMany({
    where: query
      ? {
          OR: [
            { code: { contains: query } },
            { name: { contains: query } }
          ]
        }
      : undefined,
    orderBy: [{ code: "asc" }]
  });
}
