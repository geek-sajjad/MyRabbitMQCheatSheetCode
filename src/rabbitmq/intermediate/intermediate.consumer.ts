import { Injectable, OnModuleInit } from '@nestjs/common';
// import * as amqp from 'amqplib';
import { RabbitMQService } from '../services/rabbitmq.service';
import { PaymentService } from '../../payment/services/payment.service';
import { StripeService } from '../../payment/services/stripe.service';

/**
 * INTERMEDIATE LEVEL: Work Queues with Manual Acknowledgments
 *
 * This demonstrates production-ready patterns:
 * - Durable queues (survive broker restarts)
 * - Manual acknowledgments (prefetch for load balancing)
 * - Persistent messages
 * - Fair dispatch (one message per worker)
 * - Proper error handling with nack
 */
@Injectable()
export class IntermediateConsumer implements OnModuleInit {
  private readonly paymentQueue = 'payment_processing';
  private readonly fraudCheckQueue = 'fraud_check';

  constructor(
    private rabbitMQService: RabbitMQService,
    private paymentService: PaymentService,
    private stripeService: StripeService,
  ) {}

  async onModuleInit() {
    await this.waitForRabbitMQ();
    await this.consumePaymentProcessing();
    await this.consumeFraudChecks();
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
          `⏳ [INTERMEDIATE] Waiting for RabbitMQ connection... (${i + 1}/${maxRetries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error('Failed to connect to RabbitMQ after multiple attempts');
  }

  /**
   * Payment Processing Worker
   *
   * Features:
   * - Durable queue (messages persist)
   * - Manual ack (reliability)
   * - Fair dispatch (load balancing)
   * - Prefetch (only 1 message at a time)
   */
  private async consumePaymentProcessing() {
    const channel = this.rabbitMQService.getChannel();

    // Durable queue - survives broker restarts
    await channel.assertQueue(this.paymentQueue, { durable: true });

    // Fair dispatch - only 1 unacked message per worker
    channel.prefetch(1);

    console.log(`🎓 [INTERMEDIATE] Payment processing consumer started`);

    channel.consume(this.paymentQueue, async (msg) => {
      if (!msg) return;

      try {
        const message = JSON.parse(msg.content.toString());
        console.log(`📥 [INTERMEDIATE] Processing payment:`, message.id);

        // Find and process payment
        const payment = await this.paymentService.findOne(message.id);
        await this.paymentService.processPayment(payment);

        // Manual acknowledgment - message removed from queue
        channel.ack(msg);

        console.log(`✅ [INTERMEDIATE] Payment ${message.id} completed`);
      } catch (error) {
        console.error(`❌ [INTERMEDIATE] Payment failed:`, error.message);

        // Negative acknowledgment - message goes back to queue
        // requeue: false would send to DLQ (expert level)
        channel.nack(msg, false, true);
      }
    });
  }

  /**
   * Fraud Check Worker
   *
   * Demonstrates long-running tasks with delays
   */
  private async consumeFraudChecks() {
    const channel = this.rabbitMQService.getChannel();

    await channel.assertQueue(this.fraudCheckQueue, { durable: true });
    channel.prefetch(1);

    console.log(`🎓 [INTERMEDIATE] Fraud check consumer started`);

    channel.consume(this.fraudCheckQueue, async (msg) => {
      if (!msg) return;

      try {
        const message = JSON.parse(msg.content.toString());
        console.log(
          `🔍 [INTERMEDIATE] Checking fraud for payment:`,
          message.paymentId,
        );

        // Simulate fraud detection (takes time)
        const fraudResult = await this.stripeService.checkFraud(
          message.amount,
          message.userId,
        );

        console.log(`🔍 [INTERMEDIATE] Fraud check result:`, fraudResult);

        // If high risk, mark for manual review
        if (fraudResult.risk === 'high') {
          console.log(
            `⚠️ [INTERMEDIATE] High risk detected for payment ${message.paymentId}`,
          );
        }

        channel.ack(msg);
        console.log(`✅ [INTERMEDIATE] Fraud check completed`);
      } catch (error) {
        console.error(`❌ [INTERMEDIATE] Fraud check failed:`, error.message);
        channel.nack(msg, false, true);
      }
    });
  }
}
