import { Injectable, OnModuleInit } from '@nestjs/common';
// import * as amqp from 'amqplib';
import { RabbitMQService } from '../services/rabbitmq.service';
import { PaymentService } from '../../payment/services/payment.service';

/**
 * BEGINNER LEVEL: Basic Payment Queue Consumer
 *
 * This demonstrates the simplest form of RabbitMQ messaging:
 * - Basic queue declaration
 * - Message consumption
 * - JSON deserialization
 * - Auto-acknowledgment (suitable for simple, fast tasks)
 */
@Injectable()
export class BeginnerConsumer implements OnModuleInit {
  private readonly queue = 'payments';

  constructor(
    private rabbitMQService: RabbitMQService,
    private paymentService: PaymentService,
  ) {}

  async onModuleInit() {
    // Wait a bit for RabbitMQ to connect
    await this.waitForRabbitMQ();
    await this.consumePayments();
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
          `⏳ [BEGINNER] Waiting for RabbitMQ connection... (${i + 1}/${maxRetries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error('Failed to connect to RabbitMQ after multiple attempts');
  }

  /**
   * Basic consumer for payment processing
   * No acknowledgments - messages are auto-ack'd
   * Not suitable for critical operations
   */
  private async consumePayments() {
    const channel = this.rabbitMQService.getChannel();

    // Assert queue exists (non-durable queue)
    await channel.assertQueue(this.queue, { durable: false });

    console.log(`🎓 [BEGINNER] Consumer started on queue: ${this.queue}`);

    channel.consume(this.queue, async (msg) => {
      if (!msg) return;

      try {
        const message = JSON.parse(msg.content.toString());
        console.log(`📥 [BEGINNER] Processing payment:`, message);

        // Find payment and process it
        const payment = await this.paymentService.findOne(message.id);
        await this.paymentService.processPayment(payment);

        // Auto-acknowledge (message is deleted from queue immediately)
        channel.ack(msg);

        console.log(`✅ [BEGINNER] Payment processed successfully`);
      } catch (error) {
        console.error(`❌ [BEGINNER] Error processing payment:`, error.message);
        channel.ack(msg); // Even on error, message is consumed (NOT production-ready!)
      }
    });
  }
}
