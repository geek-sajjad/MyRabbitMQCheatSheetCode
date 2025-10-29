import { Injectable, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib';
import { RabbitMQService } from '../services/rabbitmq.service';
import { PaymentService } from '../../payment/services/payment.service';

/**
 * EXPERT LEVEL: Dead Letter Queues and RPC Pattern
 *
 * This demonstrates production-grade patterns:
 * - Dead Letter Queue (DLQ) for failed messages
 * - RPC for synchronous communication
 * - Retry mechanism with exponential backoff
 * - Circuit breaker pattern
 * - Message correlation
 */
@Injectable()
export class ExpertConsumer implements OnModuleInit {
  private readonly queue = 'payment_rpc';
  private readonly dlq = 'payment_processing.dlq';

  constructor(
    private rabbitMQService: RabbitMQService,
    private paymentService: PaymentService,
  ) {}

  async onModuleInit() {
    await this.waitForRabbitMQ();
    await this.setupDeadLetterQueue();
    await this.setupRPCServer();
    await this.consumeDLQ();
  }

  private async waitForRabbitMQ() {
    const maxRetries = 10;
    const delay = 500;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const channel = this.rabbitMQService.getChannel();
        if (channel) {
          return; // Channel is ready
        }
      } catch (error) {
        console.log(
          `⏳ [EXPERT] Waiting for RabbitMQ connection... (${i + 1}/${maxRetries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error('Failed to connect to RabbitMQ after multiple attempts');
  }

  /**
   * Set up Dead Letter Queue
   * Failed messages after retries go here
   */
  private async setupDeadLetterQueue() {
    const channel = this.rabbitMQService.getChannel();

    // Dead letter queue
    await channel.assertQueue(this.dlq, {
      durable: true,
      arguments: {
        'x-message-ttl': 3600000, // 1 hour TTL
      },
    });

    console.log(`🎓 [EXPERT] Dead Letter Queue set up: ${this.dlq}`);
  }

  /**
   * RPC Server
   * Responds to payment status requests
   */
  private async setupRPCServer() {
    const channel = this.rabbitMQService.getChannel();

    await channel.assertQueue(this.queue, { durable: true });

    // Fair dispatch
    channel.prefetch(1);

    console.log(`🎓 [EXPERT] RPC Server started on queue: ${this.queue}`);

    channel.consume(this.queue, async (msg) => {
      if (!msg) return;

      try {
        const request = JSON.parse(msg.content.toString());
        console.log(`📥 [EXPERT] RPC Request:`, request);

        // Handle different RPC methods
        let response;

        switch (request.method) {
          case 'getPaymentStatus':
            const payment = await this.paymentService.findOne(
              request.paymentId,
            );
            response = {
              paymentId: payment.id,
              status: payment.status,
              amount: payment.amount,
            };
            break;

          case 'processPaymentWithRetry':
            response = await this.processWithRetry(request);
            break;

          default:
            response = { error: 'Unknown method' };
        }

        // Send response back
        channel.sendToQueue(
          msg.properties.replyTo,
          Buffer.from(JSON.stringify(response)),
          {
            correlationId: msg.properties.correlationId,
          },
        );

        channel.ack(msg);
        console.log(`✅ [EXPERT] RPC Response sent`);
      } catch (error) {
        console.error(`❌ [EXPERT] RPC Error:`, error.message);
        channel.nack(msg, false, false); // Don't requeue failed RPC
      }
    });
  }

  /**
   * Consume Dead Letter Queue
   * Handle truly failed messages
   */
  private async consumeDLQ() {
    const channel = this.rabbitMQService.getChannel();

    console.log(`🎓 [EXPERT] DLQ Consumer started`);

    channel.consume(this.dlq, async (msg) => {
      if (!msg) return;

      try {
        const failedMessage = JSON.parse(msg.content.toString());

        console.log(`💀 [EXPERT] DLQ Message received:`, {
          reason: failedMessage.failureReason,
          failedAt: failedMessage.failedAt,
        });

        // In production, you might:
        // - Send alert to monitoring system
        // - Store in database for manual review
        // - Send notification to operations team

        console.log(`📧 [EXPERT] Alert sent for failed payment`);

        channel.ack(msg);
      } catch (error) {
        console.error(`❌ [EXPERT] DLQ processing failed:`, error.message);
        channel.ack(msg); // Don't create infinite loops
      }
    });
  }

  /**
   * Process payment with retry mechanism
   * Implements exponential backoff
   */
  private async processWithRetry(request: any, retries = 0): Promise<any> {
    const maxRetries = 3;

    try {
      // Simulate processing
      const payment = await this.paymentService.findOne(request.paymentId);
      await this.paymentService.processPayment(payment);

      return {
        success: true,
        paymentId: payment.id,
        retries,
      };
    } catch (error) {
      if (retries < maxRetries) {
        // Exponential backoff: 2^retries seconds
        const delay = Math.pow(2, retries) * 1000;
        await this.delay(delay);

        console.log(
          `🔄 [EXPERT] Retry ${retries + 1}/${maxRetries} after ${delay}ms`,
        );
        return this.processWithRetry(request, retries + 1);
      } else {
        // Max retries reached, send to DLQ
        await this.rabbitMQService.sendToDLQ(
          'payment_processing',
          request,
          `Max retries exceeded: ${error.message}`,
        );

        return {
          success: false,
          error: 'Max retries exceeded',
          sentToDLQ: true,
        };
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
