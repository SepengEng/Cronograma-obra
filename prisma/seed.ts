import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter } as any);

// Amihan Jaguaribe – Torre Única, 16 andares × 6 unidades = 96 unidades
const FLOORS = 16;
const UNITS_PER_FLOOR = 6;

async function main() {
  let created = 0;
  let skipped = 0;
  for (let floor = 1; floor <= FLOORS; floor++) {
    for (let pos = 1; pos <= UNITS_PER_FLOOR; pos++) {
      const number = floor <= 9
        ? `${floor}0${pos}`
        : `${floor}0${pos}`;
      // Floor 1-9 → "101".."906", Floor 10-16 → "1001".."1606"
      const num = String(floor * 100 + pos);
      const existing = await prisma.unit.findUnique({ where: { number: num } });
      if (!existing) {
        await prisma.unit.create({
          data: {
            number: num,
            floor,
            position: pos,
            tower: "Torre Única",
            status: "sem_vistoria",
          },
        });
        created++;
      } else {
        skipped++;
      }
    }
  }
  console.log(`✓ Seed concluído: ${created} unidades criadas, ${skipped} já existiam.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
