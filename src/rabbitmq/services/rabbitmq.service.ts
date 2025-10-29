import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as amqp from 'amqplib';
import { RabbitMQConfigService } from '../config/rabbitmq-config.service';
import { Payment } from '../../payment/entities/payment.entity';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private connection: amqp.Connection;
  private channel: amqp.Channel;

  constructor(private configService: RabbitMQConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    if (this.channel) await this.channel.close();
  }

  private async connect() {
    // Close existing channel silently if it exists
    if (this.channel) {
      await this.channel.close().catch(() => {
        // Ignore errors when closing (channel might already be closed)
      });
    }

    const channelModel = await amqp.connect(this.configService.connectionUrl);
    this.channel = await channelModel.createChannel();
    this.connection = this.channel.connection;

    // Set up error handlers
    this.channel.on('error', (err) => {
      console.error('❌ RabbitMQ channel error:', err.message);
    });

    this.channel.on('close', () => {
      console.warn('⚠️ RabbitMQ channel closed');
    });

    this.connection.on('error', (err) => {
      console.error('❌ RabbitMQ connection error:', err.message);
    });

    this.connection.on('close', () => {
      console.warn('⚠️ RabbitMQ connection closed');
      this.channel = null;
      this.connection = null;
    });

    console.log('✅ Connected to RabbitMQ');
  }

  /**
   * Ensures channel is ready, reconnects if necessary
   */
  private async ensureChannel(): Promise<void> {
    if (this.channel && this.connection) {
      return;
    }

    console.warn(
      '⚠️ RabbitMQ channel not initialized, attempting to reconnect...',
    );
    await this.connect();
  }

  /**
   * Checks if error is a channel/connection error
   */
  private isChannelError(error: any): boolean {
    return (
      error?.code === 'ECONNRESET' ||
      error?.message?.includes('closed') ||
      error?.message?.includes('Channel closed') ||
      error?.message?.includes('Connection closed')
    );
  }

  /**
   * Serializes message to buffer with error handling
   */
  private serializeMessage(message: any): Buffer {
    return Buffer.from(JSON.stringify(message));
  }

  /**
   * Sends message to queue with automatic retry on channel errors
   */
  private async sendToQueueWithRetry(
    queue: string,
    messageBuffer: Buffer,
    options: amqp.Options.AssertQueue = { durable: false },
    logPrefix?: string,
  ): Promise<boolean> {
    await this.ensureChannel();
    await this.channel.assertQueue(queue, options);

    const sent = this.channel.sendToQueue(queue, messageBuffer);
    if (sent && logPrefix) {
      console.log(logPrefix);
    }
    return sent;
  }

  /**
   * BEGINNER LEVEL: Basic Payment Queue
   * Simple queue for payment processing
   */
  async sendToPaymentQueue(payment: Payment): Promise<void> {
    if (!payment?.id) {
      throw new Error('Invalid payment data provided');
    }

    const queue = 'payments';
    const createPaymentMessage = () => ({
      id: payment.id,
      userId: payment.userId,
      orderId: payment.orderId,
      amount: payment.amount,
      currency: payment.currency,
      paymentMethod: payment.paymentMethod,
      last4digits: payment.last4digits,
    });

    try {
      const messageBuffer = this.serializeMessage(createPaymentMessage());
      const sent = await this.sendToQueueWithRetry(
        queue,
        messageBuffer,
        { durable: false },
        `📤 Sent payment ${payment.id} to ${queue} queue`,
      );

      if (!sent) {
        console.warn(
          `⚠️ Message for payment ${payment.id} was not sent (queue may be full). Consider implementing backpressure handling.`,
        );
      }
    } catch (error) {
      // If channel error, retry once with reconnection
      if (this.isChannelError(error)) {
        console.warn(
          '⚠️ RabbitMQ channel error detected, attempting to reconnect...',
        );
        await this.connect();

        const messageBuffer = this.serializeMessage(createPaymentMessage());
        const sent = await this.sendToQueueWithRetry(
          queue,
          messageBuffer,
          { durable: false },
          `📤 Sent payment ${payment.id} to ${queue} queue (after reconnection)`,
        );

        if (!sent) {
          console.warn(
            `⚠️ Message for payment ${payment.id} was not sent after reconnection (queue may be full).`,
          );
        }
        return;
      }

      // Log and throw for non-channel errors
      console.error(
        `❌ Failed to send payment ${payment.id} to RabbitMQ queue '${queue}':`,
        error.message,
        error.stack ? `\nStack trace: ${error.stack}` : '',
      );

      const enhancedError = new Error(
        `Unable to queue payment ${payment.id} for processing: ${error.message}`,
      ) as Error & { originalError?: Error };
      enhancedError.originalError = error;
      throw enhancedError;
    }
  }

  /**
   * INTERMEDIATE LEVEL: Durable Work Queue
   * Queue with persistence and manual acknowledgments
   */
  async sendToWorkQueue(queueName: string, task: any): Promise<void> {
    await this.channel.assertQueue(queueName, { durable: true });

    this.channel.sendToQueue(queueName, Buffer.from(JSON.stringify(task)), {
      persistent: true,
    });

    console.log(`📤 Sent task to durable queue: ${queueName}`);
  }

  /**
   * ADVANCED LEVEL: Topic Exchange
   * Route messages based on patterns
   */
  async sendToTopicExchange(
    exchange: string,
    routingKey: string,
    message: any,
  ): Promise<void> {
    await this.channel.assertExchange(exchange, 'topic', { durable: true });

    this.channel.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      { persistent: true },
    );

    console.log(`📤 Sent to topic '${routingKey}' via exchange '${exchange}'`);
  }

  /**
   * EXPERT LEVEL: Dead Letter Queue
   * Handle failed messages
   */
  async sendToDLQ(
    queueName: string,
    message: any,
    reason: string,
  ): Promise<void> {
    const dlqName = `${queueName}.dlq`;

    await this.channel.assertQueue(dlqName, { durable: true });

    const enhancedMessage = {
      ...message,
      failedAt: new Date(),
      failureReason: reason,
    };

    this.channel.sendToQueue(
      dlqName,
      Buffer.from(JSON.stringify(enhancedMessage)),
    );

    console.log(`📤 Sent failed message to DLQ: ${dlqName}`);
  }

  /**
   * Get channel for advanced operations
   */
  getChannel(): amqp.Channel {
    if (!this.channel) {
      throw new Error(
        'RabbitMQ channel is not initialized yet. Make sure RabbitMQService has finished connecting.',
      );
    }
    return this.channel;
  }

  getConnection(): amqp.Connection {
    return this.connection;
  }
}
