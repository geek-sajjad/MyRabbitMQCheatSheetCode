export interface ProcessPaymentMessage {
  paymentId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  userId: string;
  orderId: string;
  last4digits?: string;
}
