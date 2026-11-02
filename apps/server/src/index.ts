import { env } from './config/env';
import { createApp } from './app';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { pruneExpiredTokens } from './modules/auth/token.service';
import { startDemoMode } from './demo/demoMode';
import { seedDemo } from './demo/seed';

async function main() {
  await prisma.$connect();
  if (env.DEMO_MODE) await startDemoMode();
  else if (env.SEED_DEMO_DATA && (await prisma.user.count()) === 0) {
    await seedDemo(prisma, { log: (m) => logger.info(m) });
  }

  const app = createApp();
  const server = app.listen(env.PORT, env.HOST, () => {
    logger.info(
      `🚀 SalesReport AI API listening on http://${env.HOST === '0.0.0.0' ? 'localhost' : env.HOST}:${env.PORT} (${env.NODE_ENV})`,
    );
  });
  server.requestTimeout = 120_000;
  server.headersTimeout = 65_000;

  const housekeeping = setInterval(() => {
    pruneExpiredTokens().catch((err) => logger.error({ err }, 'token pruning failed'));
  }, 6 * 3600_000);
  housekeeping.unref();

  const shutdown = (signal: string) => {
    logger.info({ signal }, 'shutting down');
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (err) => logger.error({ err }, 'unhandled rejection'));
}

main().catch((err) => {
  logger.fatal({ err }, 'failed to start');
  process.exit(1);
});
