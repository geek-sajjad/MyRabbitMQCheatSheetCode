import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');

    // Initialize with test key if no key provided (for learning purposes)
    this.stripe = new Stripe(secretKey || 'sk_test_mock_key_for_learning', {
      apiVersion: '2023-08-16',
    });
  }

  /**
   * Simulate payment intent creation
   * In production, this would call Stripe API
   */
  async createPaymentIntent(
    amount: number,
    currency: string,
    metadata?: any,
  ): Promise<any> {
    // Simulate processing time
    await this.delay(1000);

    // Simulate success (90% success rate for learning)
    const success = Math.random() > 0.1;

    if (success) {
      return {
        id: `pi_mock_${Date.now()}`,
        status: 'succeeded',
        amount,
        currency,
        metadata,
      };
    } else {
      throw new Error('Payment failed: Insufficient funds');
    }
  }

  /**
   * Simulate refund processing
   */
  async createRefund(paymentIntentId: string, amount?: number): Promise<any> {
    await this.delay(500);

    return {
      id: `re_mock_${Date.now()}`,
      status: 'succeeded',
      payment_intent: paymentIntentId,
      amount: amount || null,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Simulate fraud check
   * In a real scenario, this would call fraud detection services
   */
  async checkFraud(
    amount: number,
    userId: string,
  ): Promise<{ risk: 'low' | 'medium' | 'high'; score: number }> {
    await this.delay(2000); // Simulate analysis time

    // Simulate fraud detection logic
    const risk = amount > 10000 ? 'high' : amount > 1000 ? 'medium' : 'low';
    const score = risk === 'high' ? 85 : risk === 'medium' ? 45 : 10;

    return { risk, score };
  }
}
