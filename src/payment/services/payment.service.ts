import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from '../entities/payment.entity';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { StripeService } from './stripe.service';
import { RabbitMQService } from '../../rabbitmq/services/rabbitmq.service';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    private stripeService: StripeService,
    private rabbitMQService: RabbitMQService,
  ) {}

  async create(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    const payment = this.paymentRepository.create({
      ...createPaymentDto,
      status: PaymentStatus.PENDING,
    });

    const savedPayment = await this.paymentRepository.save(payment);

    // BEGINNER: Send to basic queue
    await this.rabbitMQService.sendToPaymentQueue(savedPayment);

    // INTERMEDIATE: Also send to durable work queue
    await this.rabbitMQService.sendToWorkQueue('payment_processing', {
      paymentId: savedPayment.id,
      userId: savedPayment.userId,
      orderId: savedPayment.orderId,
      amount: savedPayment.amount,
      currency: savedPayment.currency,
    });

    // // INTERMEDIATE: Send to fraud check queue
    // await this.rabbitMQService.sendToWorkQueue('fraud_check', {
    //   paymentId: savedPayment.id,
    //   amount: savedPayment.amount,
    //   userId: savedPayment.userId,
    // });

    return savedPayment;
  }

  async findOne(id: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return payment;
  }

  async findAll(): Promise<Payment[]> {
    return this.paymentRepository.find({
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async processPayment(payment: Payment): Promise<void> {
    try {
      // Update status to processing
      payment.status = PaymentStatus.PROCESSING;
      await this.paymentRepository.save(payment);

      // Simulate payment processing with Stripe
      const result = await this.stripeService.createPaymentIntent(
        payment.amount,
        payment.currency,
        {
          userId: payment.userId,
          orderId: payment.orderId,
        },
      );

      // Update payment with success
      payment.status = PaymentStatus.COMPLETED;
      payment.stripePaymentId = result.id;
      payment.processedAt = new Date();
      await this.paymentRepository.save(payment);

      // ADVANCED: Send event to topic exchange
      await this.rabbitMQService.sendToTopicExchange(
        'payment_events',
        'payment.complete',
        {
          paymentId: payment.id,
          type: 'complete',
          amount: payment.amount,
          userId: payment.userId,
        },
      );

      console.log(`✅ Payment ${payment.id} processed successfully`);
    } catch (error) {
      console.error(`❌ Payment ${payment.id} failed:`, error.message);

      // Update payment with failure
      payment.status = PaymentStatus.FAILED;
      payment.failureReason = error.message;
      await this.paymentRepository.save(payment);

      // ADVANCED: Send declined event
      // await this.rabbitMQService.sendToTopicExchange(
      //   'payment_events',
      //   'payment.credit.decline',
      //   {
      //     paymentId: payment.id,
      //     type: 'decline',
      //     reason: error.message,
      //   },
      // );

      throw error;
    }
  }

  async refund(id: string, refundAmount?: number): Promise<Payment> {
    const payment = await this.findOne(id);

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new Error('Can only refund completed payments');
    }

    try {
      await this.stripeService.createRefund(
        payment.stripePaymentId,
        refundAmount,
      );

      payment.status = PaymentStatus.REFUNDED;
      await this.paymentRepository.save(payment);

      return payment;
    } catch (error) {
      throw new Error(`Failed to process refund: ${error.message}`);
    }
  }

  async updateStatus(id: string, status: PaymentStatus): Promise<void> {
    await this.paymentRepository.update(id, { status });
  }
}
