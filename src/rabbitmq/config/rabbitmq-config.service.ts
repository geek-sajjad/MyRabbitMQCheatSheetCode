import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RabbitMQConfigService {
  constructor(private configService: ConfigService) {}

  get connectionUrl(): string {
    const user = this.configService.get<string>('RABBITMQ_USER') || 'admin';
    const pass = this.configService.get<string>('RABBITMQ_PASS') || 'admin123';
    const host = this.configService.get<string>('RABBITMQ_HOST') || 'localhost';
    const port = this.configService.get<string>('RABBITMQ_PORT') || '5672';

    return `amqp://${user}:${pass}@${host}:${port}`;
  }

  get host(): string {
    return this.configService.get<string>('RABBITMQ_HOST') || 'localhost';
  }

  get port(): number {
    const port = this.configService.get<string>('RABBITMQ_PORT');
    return port ? parseInt(port, 10) : 5672;
  }

  get username(): string {
    return this.configService.get<string>('RABBITMQ_USER') || 'admin';
  }

  get password(): string {
    return this.configService.get<string>('RABBITMQ_PASS') || 'admin123';
  }
}
