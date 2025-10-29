import { Injectable, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib';
import { RabbitMQService } from '../services/rabbitmq.service';
import { PaymentService } from '../../payment/services/payment.service';

/**
 * ADVANCED LEVEL: Topic Exchange with Pattern Routing
 *
 * This demonstrates sophisticated message routing:
 * - Topic exchange for pattern-based routing
 * - Multiple queues bound to same exchange
 * - Selective message consumption based on routing keys
 * - Email notifications for payment events
 * - Audit logging for compliance
 */
@Injectable()
export class AdvancedConsumer implements OnModuleInit {
  private readonly exchange = 'payment_events';

  // Different routing patterns
  private readonly routingPatterns = {
    approve: 'payment.credit.approve',
    decline: 'payment.credit.decline',
    refund: 'payment.refund',
    complete: 'payment.complete',
    fraud: 'payment.fraud.detect',
  };

  constructor(
    private rabbitMQService: RabbitMQService,
    private paymentService: PaymentService,
  ) {}

  async onModuleInit() {
    await this.waitForRabbitMQ();
    await this.consumeApprovedPayments();
    await this.consumeRefunds();
    await this.consumeEmailNotifications();
    await this.consumeAuditLogs();
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
          `⏳ [ADVANCED] Waiting for RabbitMQ connection... (${i + 1}/${maxRetries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error('Failed to connect to RabbitMQ after multiple attempts');
  }

  /**
   * Consume approved credit card payments
   * Routing key: payment.credit.approve
   */
  private async consumeApprovedPayments() {
    const channel = this.rabbitMQService.getChannel();
    const queue = 'approved_payments';

    await channel.assertExchange(this.exchange, 'topic', { durable: true });
    await channel.assertQueue(queue, { durable: true });

    // Bind with exact match
    await channel.bindQueue(queue, this.exchange, this.routingPatterns.approve);

    channel.prefetch(1);

    console.log(`🎓 [ADVANCED] Approved payments consumer started`);

    channel.consume(queue, async (msg) => {
      if (!msg) return;

      try {
        const message = JSON.parse(msg.content.toString());
        console.log(`✅ [ADVANCED] Approved payment:`, message.paymentId);

        // Process approved payment
        const payment = await this.paymentService.findOne(message.paymentId);
        await this.paymentService.updateStatus(
          message.paymentId,
          payment.status,
        );

        channel.ack(msg);
      } catch (error) {
        console.error(`❌ [ADVANCED] Error:`, error.message);
        channel.nack(msg, false, true);
      }
    });
  }

  /**
   * Consume refund requests
   * Routing key: payment.refund
   */
  private async consumeRefunds() {
    const channel = this.rabbitMQService.getChannel();
    const queue = 'refund_requests';

    await channel.assertExchange(this.exchange, 'topic', { durable: true });
    await channel.assertQueue(queue, { durable: true });

    await channel.bindQueue(queue, this.exchange, this.routingPatterns.refund);

    channel.prefetch(1);

    console.log(`🎓 [ADVANCED] Refund consumer started`);

    channel.consume(queue, async (msg) => {
      if (!msg) return;

      try {
        const message = JSON.parse(msg.content.toString());
        console.log(`💰 [ADVANCED] Processing refund:`, message.paymentId);

        await this.paymentService.refund(message.paymentId, message.amount);

        channel.ack(msg);
        console.log(`✅ [ADVANCED] Refund processed`);
      } catch (error) {
        console.error(`❌ [ADVANCED] Refund failed:`, error.message);
        channel.nack(msg, false, true);
      }
    });
  }

  /**
   * Email notification worker
   * Uses wildcard pattern: payment.* (catches all payment events)
   */
  private async consumeEmailNotifications() {
    const channel = this.rabbitMQService.getChannel();
    const queue = 'email_notifications';

    await channel.assertExchange(this.exchange, 'topic', { durable: true });
    await channel.assertQueue(queue, { durable: true });

    // Wildcard binding - receives all payment events
    await channel.bindQueue(queue, this.exchange, 'payment.*');

    channel.prefetch(10);

    console.log(`🎓 [ADVANCED] Email notification consumer started`);

    channel.consume(queue, async (msg) => {
      if (!msg) return;

      try {
        const message = JSON.parse(msg.content.toString());
        console.log(`📧 [ADVANCED] Sending email for event:`, message.type);

        // Simulate email sending
        await this.sendEmail(message);

        channel.ack(msg);
      } catch (error) {
        console.error(`❌ [ADVANCED] Email failed:`, error.message);
        channel.nack(msg, false, true);
      }
    });
  }

  /**
   * Audit logging worker
   * Logs all payment events for compliance
   */
  private async consumeAuditLogs() {
    const channel = this.rabbitMQService.getChannel();
    const queue = 'audit_logs';

    await channel.assertExchange(this.exchange, 'topic', { durable: true });
    await channel.assertQueue(queue, { durable: true });

    // Catch all payment events
    await channel.bindQueue(queue, this.exchange, 'payment.*');

    console.log(`🎓 [ADVANCED] Audit log consumer started`);

    channel.consume(queue, async (msg) => {
      if (!msg) return;

      try {
        const message = JSON.parse(msg.content.toString());
        console.log(`📝 [ADVANCED] Audit log:`, {
          timestamp: new Date(),
          event: message.type,
          paymentId: message.paymentId,
          ...message,
        });

        channel.ack(msg);
      } catch (error) {
        console.error(`❌ [ADVANCED] Audit log failed:`, error.message);
        channel.ack(msg); // Don't requeue audit logs
      }
    });
  }

  private async sendEmail(message: any): Promise<void> {
    // Simulate email sending
    console.log(`📧 Email sent to user about ${message.type}`);
  }
}
