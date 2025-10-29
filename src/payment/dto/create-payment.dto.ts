import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  Min,
  IsUUID,
} from 'class-validator';
import { PaymentMethod } from '../entities/payment.entity';

export class CreatePaymentDto {
  @IsString()
  @IsUUID()
  userId: string;

  @IsString()
  @IsUUID()
  orderId: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  currency: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  last4digits?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
