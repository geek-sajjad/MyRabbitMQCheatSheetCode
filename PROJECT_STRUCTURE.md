# Project Structure

## Directory Layout

```
e-commerce-rabbitmq/
├── src/
│   ├── payment/                      # Payment Processing Module
│   │   ├── entities/                 # TypeORM Entities
│   │   │   └── payment.entity.ts     # Payment entity with status tracking
│   │   ├── dto/                      # Data Transfer Objects
│   │   │   ├── create-payment.dto.ts
│   │   │   ├── process-payment.dto.ts
│   │   │   └── refund-payment.dto.ts
│   │   ├── services/                 # Business Logic
│   │   │   ├── payment.service.ts    # Core payment operations
│   │   │   └── stripe.service.ts     # Stripe integration (simulated)
│   │   └── controllers/              # API Endpoints
│   │       └── payment.controller.ts
│   │
│   ├── rabbitmq/                     # RabbitMQ Module
│   │   ├── config/                   # Configuration
│   │   │   └── rabbitmq-config.service.ts
│   │   ├── services/                 # RabbitMQ Service
│   │   │   └── rabbitmq.service.ts   # Connection and publishing logic
│   │   ├── beginner/                 # 🎓 Beginner Level
│   │   │   └── beginner.consumer.ts  # Basic queue consumer
│   │   ├── intermediate/             # 🎓 Intermediate Level
│   │   │   └── intermediate.consumer.ts  # Work queues, fraud detection
│   │   ├── advanced/                 # 🎓 Advanced Level
│   │   │   └── advanced.consumer.ts  # Topic exchange routing
│   │   └── expert/                   # 🎓 Expert Level
│   │       └── expert.consumer.ts    # DLQ, RPC patterns
│   │
│   ├── common/                       # Shared Utilities
│   │   ├── decorators/
│   │   │   └── route-param.decorator.ts
│   │   └── utils/
│   │       └── uuid.util.ts
│   │
│   ├── app.module.ts                 # Root Module
│   └── main.ts                       # Application Entry Point
│
├── examples/                         # Example Scripts
│   └── test-payment.sh              # Payment testing script
│
├── docker-compose.yml               # Docker services configuration
├── package.json                     # Dependencies and scripts
├── tsconfig.json                    # TypeScript configuration
├── nest-cli.json                    # NestJS CLI configuration
│
├── README.md                        # Project overview
├── USAGE.md                         # Quick start guide
├── LEARNING_GUIDE.md                # Detailed learning path
└── PROJECT_STRUCTURE.md             # This file

```

## Module Breakdown

### Payment Module

**Purpose**: Handle payment transactions

**Key Components**:

- `Payment` entity: Database model with status tracking
- `PaymentService`: Core business logic
- `StripeService`: Simulated payment gateway
- `PaymentController`: REST API endpoints

**Features**:

- Create payments
- Process payments asynchronously
- Track payment status
- Support refunds
- Audit trail

---

### RabbitMQ Module

#### Beginner Level

**File**: `src/rabbitmq/beginner/beginner.consumer.ts`

**Concepts**:

- Basic queue declaration
- Auto-acknowledgment
- JSON message parsing
- Simple consume pattern

**Queue**: `payments`

**Use Case**: Quick, non-critical processing

---

#### Intermediate Level

**File**: `src/rabbitmq/intermediate/intermediate.consumer.ts`

**Concepts**:

- Durable queues
- Manual acknowledgments
- Prefetch for load balancing
- Persistent messages
- Error handling with nack

**Queues**:

- `payment_processing`: Payment processing with reliability
- `fraud_check`: Fraud detection with simulated delays

**Use Case**: Production-ready background processing

---

#### Advanced Level

**File**: `src/rabbitmq/advanced/advanced.consumer.ts`

**Concepts**:

- Topic exchange routing
- Pattern-based message routing
- Multiple consumers for same messages
- Wildcard routing

**Exchange**: `payment_events` (topic)

**Queues and Routing Keys**:

- `approved_payments` ← `payment.credit.approve`
- `refund_requests` ← `payment.refund`
- `email_notifications` ← `payment.*` (all events)
- `audit_logs` ← `payment.*` (all events)

**Use Case**: Microservices architecture

---

#### Expert Level

**File**: `src/rabbitmq/expert/expert.consumer.ts`

**Concepts**:

- Dead Letter Queue (DLQ)
- RPC pattern
- Retry with exponential backoff
- Message correlation
- Circuit breaker

**Queues**:

- `payment_rpc`: RPC requests
- `payment_processing.dlq`: Failed messages

**Use Case**: Production fault tolerance

---

## Data Flow

### Payment Creation Flow

```
1. POST /api/payments
   ↓
2. PaymentService.create()
   ↓
3. Save to PostgreSQL
   ↓
4. Send to RabbitMQ (Beginner Queue)
   ↓
5. Send to Work Queues (Intermediate)
   - payment_processing
   - fraud_check
   ↓
6. Consumers process messages:
   - Update database status
   - Send to topic exchange (Advanced)
   ↓
7. Topic exchange routes to:
   - Email notifications
   - Audit logs
   - Approved/refund queues
```

### Message Flow by Level

#### Beginner Level

```
Producer → Queue → Consumer (Auto-Ack)
```

#### Intermediate Level

```
Producer → Durable Queue → Consumer
         ↓
   Fraud Check Queue
         ↓
  Manual Ack/Nack
```

#### Advanced Level

```
Producer → Topic Exchange
         ↓
   [Routing Keys]
         ↓
  Multiple Queues
   (Email, Audit, etc.)
```

#### Expert Level

```
Producer → Queue → Consumer
         ↓ (on failure)
      Retry (3x)
         ↓ (max retries)
   Dead Letter Queue
         ↓
    Alert & Review
```

---

## Technology Stack

### Backend

- **NestJS**: Web framework
- **TypeORM**: ORM for PostgreSQL
- **amqplib**: RabbitMQ client
- **Stripe**: Payment gateway (simulated)

### Databases

- **PostgreSQL**: Relational database
- **RabbitMQ**: Message broker

### DevOps

- **Docker**: Containerization
- **Docker Compose**: Multi-container orchestration

---

## Key Features

### 1. Progressive Complexity

- Start simple, advance gradually
- Each level builds on previous
- Real-world patterns

### 2. Production-Ready Patterns

- Durable queues
- Manual acknowledgments
- Error handling
- Retry mechanisms
- Dead letter queues

### 3. Scalability

- Load balancing across workers
- Fair dispatch
- Horizontal scaling ready

### 4. Observability

- RabbitMQ Management UI
- Application logs
- Status tracking
- Audit trails

---

## Learning Path

### Week 1: Basic Understanding

- Read beginner consumer
- Create payments
- Monitor queue in UI
- Understand basic flow

### Week 2: Reliability

- Study intermediate consumer
- Learn about acknowledgments
- Understand durability
- Experiment with load balancing

### Week 3: Advanced Routing

- Explore topic exchanges
- Practice routing patterns
- Understand binding
- Build routing scenarios

### Week 4: Production Patterns

- Implement DLQ
- Build RPC
- Add retries
- Fault tolerance

---

## Extension Ideas

1. **Add More Exchange Types**:
   - Direct exchange
   - Fanout exchange
   - Headers exchange

2. **Implement Priority Queues**:
   - High-value transactions first
   - VIP customers

3. **Add Monitoring**:
   - Prometheus metrics
   - Grafana dashboards
   - Health checks

4. **Circuit Breaker**:
   - Prevent cascade failures
   - Automatic recovery

5. **Distributed Tracing**:
   - Track messages across services
   - Performance monitoring

---

## File Details

### Configuration Files

**package.json**:

- All required dependencies
- Scripts for development/production
- TypeScript and Jest configuration

**docker-compose.yml**:

- RabbitMQ with management UI
- PostgreSQL database
- Network configuration
- Volume persistence

**tsconfig.json**:

- TypeScript compilation settings
- Decorators enabled for NestJS
- Path mapping configuration

### Key Source Files

**main.ts**:

- Application bootstrap
- Global configuration
- Server initialization

**app.module.ts**:

- Root application module
- Global imports
- Configuration modules

**Payment Module**:

- Complete CRUD operations
- Integration with RabbitMQ
- Stripe simulation

**RabbitMQ Module**:

- Progressive consumers
- Configuration management
- Service layer abstraction

---

## Getting Started

1. Install dependencies: `npm install`
2. Start services: `docker-compose up -d`
3. Run app: `npm run start:dev`
4. Test: Use examples/test-payment.sh
5. Monitor: http://localhost:15672

See `USAGE.md` for detailed instructions.
