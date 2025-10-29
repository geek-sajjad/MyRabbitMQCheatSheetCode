# Quick Start Guide

## Prerequisites

- Docker and Docker Compose
- Node.js 18+

## Setup

1. **Clone and Install**
```bash
git clone <repo-url>
cd e-commerce-rabbitmq
npm install
```

2. **Start Services**
```bash
# Start RabbitMQ and PostgreSQL
docker-compose up -d

# Verify services are running
docker ps
```

3. **Configure Environment**
```bash
# .env file is already created with defaults
# Optionally update Stripe keys if you have them
```

4. **Run Application**
```bash
npm run start:dev
```

## Access Points

- **API**: http://localhost:3000
- **RabbitMQ Management**: http://localhost:15672
  - Username: `admin`
  - Password: `admin123`
- **PostgreSQL**: localhost:5432
  - Database: `payment_db`
  - Username: `admin`
  - Password: `admin123`

## Create Your First Payment

```bash
curl -X POST http://localhost:3000/api/payments \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "orderId": "123e4567-e89b-12d3-a456-426614174001",
    "amount": 100.00,
    "currency": "USD",
    "paymentMethod": "credit_card",
    "last4digits": "1234"
  }'
```

## Explore RabbitMQ Management UI

1. Open http://localhost:15672
2. Login with admin/admin123
3. Navigate to "Queues" tab
4. See multiple queues active:
   - `payments` (Beginner)
   - `payment_processing` (Intermediate)
   - `fraud_check` (Intermediate)
   - `approved_payments` (Advanced)
   - `refund_requests` (Advanced)
   - `email_notifications` (Advanced)
   - `audit_logs` (Advanced)
   - `payment_processing.dlq` (Expert)

5. Watch messages flow through queues in real-time

## Check Application Logs

Look for these prefixes in your terminal:

- `🎓 [BEGINNER]` - Basic queue processing
- `🎓 [INTERMEDIATE]` - Work queues, fraud checks
- `🎓 [ADVANCED]` - Topic exchange events
- `🎓 [EXPERT]` - RPC and DLQ handling

## Test Script

Run the included test script:

```bash
chmod +x examples/test-payment.sh
./examples/test-payment.sh
```

## API Endpoints

- `POST /api/payments` - Create payment
- `GET /api/payments` - List all payments
- `GET /api/payments/:id` - Get payment by ID
- `PATCH /api/payments/:id/refund` - Refund a payment

## Next Steps

1. Read `LEARNING_GUIDE.md` for detailed explanation of each level
2. Experiment with different amounts to see fraud detection
3. Monitor queues in RabbitMQ UI
4. Try killing the app and restarting to see durable queues
5. Create multiple payments to see load balancing

## Troubleshooting

**Can't connect to RabbitMQ?**
```bash
docker-compose up -d
docker logs rabbitmq
```

**Database connection issues?**
```bash
docker logs postgres
```

**App won't start?**
```bash
# Check if ports 3000, 5432, 5672 are available
npm install  # Reinstall dependencies
```

