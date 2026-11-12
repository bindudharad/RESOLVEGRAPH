import { BuyerScreeningService } from '../src/server/seller/buyer-screening.service';
import { prisma } from '../src/lib/prisma';

async function run() {
  const result = await BuyerScreeningService.evaluateCaseScreening('RG-1461', {
    runGuardIfMissing: true,
  });
  console.log('SCREENING RG-1461:', JSON.stringify(result, null, 2));
}
run().finally(() => prisma.$disconnect());
