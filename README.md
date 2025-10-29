# E-Commerce Payment Processing with RabbitMQ

This project is a comprehensive learning exercise for RabbitMQ, implementing a payment processing system with progressive complexity levels from beginner to expert.

## Project Overview

A payment processing gateway that handles transactions, refunds, and fraud detection. RabbitMQ is used for asynchronous processing to avoid blocking users during payment verification.

## Tech Stack

- **Node.js** - Runtime environment
- **NestJS** - Web framework
- **TypeORM** - ORM for database operations
- **PostgreSQL** - Database
- **RabbitMQ** - Message broker
- **Stripe** - Payment gateway integration

## Learning Progression

### Beginner Level: Basic Payment Queuing
- Simple queue for payment requests
- Basic producer/consumer pattern
- JSON message handling

### Intermediate Level: Work Queues
- Durable queues with manual acknowledgments
- Fraud detection with delays
- Audit trail logging
- Load balancing across workers

### Advanced Level: Topic Exchanges
- Flexible routing with topic patterns
- Different handlers for different transaction types
- Priority queues for high-value transactions

### Expert Level: Production Patterns
- Dead-letter queues for failed transactions
- RPC for real-time status checks
- Retry mechanisms
- Fault tolerance

## Setup

### Prerequisites
- Docker and Docker Compose
- Node.js 18+

### Installation

1. Clone the repository
```bash
git clone <repo-url>
cd e-commerce-rabbitmq
```

2. Install dependencies
```bash
npm install
```

3. Start services with Docker Compose
```bash
docker-compose up -d
```

This will start:
- RabbitMQ on port 5672 (Management UI on 15672)
- PostgreSQL on port 5432

Access RabbitMQ Management UI: http://localhost:15672
- Username: admin
- Password: admin123

4. Create `.env` file
```bash
cp .env.example .env
# Update with your Stripe keys
```

5. Run the application
```bash
npm run start:dev
```

## Project Structure

```
src/
├── payment/           # Payment processing module
│   ├── entities/      # TypeORM entities
│   ├── dto/           # Data transfer objects
│   ├── services/      # Business logic
│   └── queue/         # Queue handlers
├── rabbitmq/          # RabbitMQ configuration
│   ├── beginner/      # Basic queue pattern
│   ├── intermediate/  # Work queues
│   ├── advanced/      # Topic exchanges
│   └── expert/        # DLQ, RPC patterns
└── common/            # Shared utilities
```

## API Endpoints

### Payment Endpoints
- `POST /payments` - Create a payment
- `GET /payments/:id` - Get payment status
- `POST /payments/:id/refund` - Refund a payment

## Learning Path

1. **Start with Beginner** - Understand basic queuing
2. **Move to Intermediate** - Learn about work queues and durability
3. **Explore Advanced** - Study topic exchanges and routing
4. **Master Expert** - Implement production-grade features

## Useful Commands

```bash
# Development
npm run start:dev

# Build
npm run build

# Production
npm run start:prod

# View RabbitMQ Management
open http://localhost:15672

# Check containers
docker ps
```

## Notes

This is a learning project focused on understanding RabbitMQ patterns. It includes:
- Multiple complexity levels
- Real-world scenarios
- Best practices
- Production considerations

