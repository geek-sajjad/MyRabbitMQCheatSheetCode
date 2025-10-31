import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';

let app;

// Default shutdown timeout: 15 seconds
const SHUTDOWN_TIMEOUT = parseInt(process.env.SHUTDOWN_TIMEOUT || '15000', 10);

async function bootstrap() {
  app = await NestFactory.create(AppModule);

  app.enableCors();
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📊 RabbitMQ Management: http://localhost:15672`);
}

/**
 * Graceful shutdown function
 * Closes the NestJS application and all connections properly
 * Includes timeout mechanism to prevent hanging
 */
async function gracefulShutdown(signal?: string) {
  console.log(
    `\n🛑 ${signal || 'Shutdown'} signal received. Starting graceful shutdown...`,
  );

  // Set up timeout to force exit if shutdown takes too long
  const shutdownTimer = setTimeout(() => {
    console.error(
      `⏰ Shutdown timeout (${SHUTDOWN_TIMEOUT}ms) exceeded. Forcing exit...`,
    );
    process.exit(1);
  }, SHUTDOWN_TIMEOUT);

  try {
    if (app) {
      try {
        // Get services before closing app (can't use app.get() after app.close())
        let dataSource: DataSource | null = null;
        try {
          dataSource = app.get(DataSource);
        } catch (error) {
          console.warn('⚠️ Could not get DataSource:', error.message);
        }

        // Close NestJS application (triggers OnModuleDestroy hooks)
        // This will call onModuleDestroy on all services including RabbitMQService
        await app.close();
        console.log('✅ NestJS application closed');

        // Explicitly close database connections if TypeORM didn't close it
        if (dataSource && dataSource.isInitialized) {
          try {
            await dataSource.destroy();
            console.log('✅ Database connection closed');
          } catch (error) {
            console.warn(
              '⚠️ Database connection might already be closed:',
              error.message,
            );
          }
        }
      } catch (error) {
        console.error('❌ Error during cleanup:', error.message);
        if (error.stack) {
          console.error('Stack:', error.stack);
        }
      }
    }

    // Clear timeout since we completed successfully
    clearTimeout(shutdownTimer);
    console.log('✅ All connections closed successfully');
    console.log('👋 Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    clearTimeout(shutdownTimer);
    console.error('❌ Fatal error during shutdown:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

/**
 * Handle uncaught exceptions
 * These are synchronous errors that were not handled
 */
process.on('uncaughtException', (error: Error) => {
  console.error('❌ UNCAUGHT EXCEPTION! Shutting down...');
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);

  gracefulShutdown('uncaughtException')
    .then(() => {
      process.exit(1);
    })
    .catch(() => {
      process.exit(1);
    });
});

/**
 * Handle unhandled promise rejections
 * These are asynchronous errors that were not caught
 */
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('❌ UNHANDLED REJECTION! Shutting down...');
  console.error('Reason:', reason?.message || reason);
  console.error('Promise:', promise);

  gracefulShutdown('unhandledRejection')
    .then(() => {
      process.exit(1);
    })
    .catch(() => {
      process.exit(1);
    });
});

/**
 * Handle termination signals (SIGTERM, SIGINT)
 * SIGTERM is typically sent by process managers like PM2, Docker, etc.
 * SIGINT is sent when user presses Ctrl+C
 */
process.on('SIGTERM', () => {
  console.log('📡 SIGTERM received');
  gracefulShutdown('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('📡 SIGINT received');
  gracefulShutdown('SIGINT');
});

bootstrap().catch((error) => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});
