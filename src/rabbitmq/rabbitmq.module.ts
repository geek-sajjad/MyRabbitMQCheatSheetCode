import { Module, Global, forwardRef } from '@nestjs/common';
import { RabbitMQConfigService } from './config/rabbitmq-config.service';
import { RabbitMQService } from './services/rabbitmq.service';
import { BeginnerConsumer } from './beginner/beginner.consumer';
import { IntermediateConsumer } from './intermediate/intermediate.consumer';
import { AdvancedConsumer } from './advanced/advanced.consumer';
import { ExpertConsumer } from './expert/expert.consumer';
import { PaymentModule } from 'src/payment/payment.module';

@Global()
@Module({
  imports: [forwardRef(() => PaymentModule)],
  providers: [
    RabbitMQConfigService,
    RabbitMQService,
    BeginnerConsumer,
    IntermediateConsumer,
    AdvancedConsumer,
    ExpertConsumer,
  ],
  exports: [RabbitMQService, RabbitMQConfigService],
})
export class RabbitMQModule {}
