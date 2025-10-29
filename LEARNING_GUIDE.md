# RabbitMQ Learning Guide

This project is designed to teach RabbitMQ concepts progressively from beginner to expert level.

## 🎯 Learning Path

### Level 1: Beginner - Basic Queuing

**Concept**: Simple message queue with producer/consumer pattern.

**What you'll learn**:
- Basic queue declaration
- Publishing messages
- Consuming messages
- Auto-acknowledgment

**Code Examples**:
- Producer: `src/rabbitmq/services/rabbitmq.service.ts` - `sendToPaymentQueue()`
- Consumer: `src/rabbitmq/beginner/beginner.consumer.ts`

**How to test**:
```bash
# Start the application
npm run start:dev

# Create a payment (triggers queue)
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

**Check RabbitMQ**:
1. Open http://localhost:15672 (admin/admin123)
2. Navigate to "Queues"
3. Look for the `payments` queue

**Key Takeaways**:
- Messages are stored in memory by default
- Auto-ack removes message immediately after delivery
- Not suitable for critical operations
- No guarantees if worker crashes

---

### Level 2: Intermediate - Work Queues

**Concept**: Durable queues with manual acknowledgments and load balancing.

**What you'll learn**:
- Durable queues (survive restarts)
- Manual acknowledgments
- Prefetch for fair dispatch
- Persistent messages
- Load balancing across workers

**Code Examples**:
- Producer: `src/rabbitmq/services/rabbitmq.service.ts` - `sendToWorkQueue()`
- Consumers: `src/rabbitmq/intermediate/intermediate.consumer.ts`

**Key Features**:
- `payment_processing` queue: Handles payment processing
- `fraud_check` queue: Simulates fraud detection with delays
- Manual ack/nack for reliability

**How to test**:
```bash
# Same API call as Level 1
# But now messages are:
# 1. Sent to basic queue (beginner)
# 2. Sent to payment_processing (intermediate)
# 3. Sent to fraud_check (intermediate)

# Check multiple queues in RabbitMQ Management UI
```

**Key Takeaways**:
- `durable: true` - Queue survives broker restart
- `persistent: true` - Messages survive broker restart
- Manual ack - Worker controls when message is deleted
- `prefetch(1)` - Fair dispatch (one message per worker)
- `nack(msg, false, true)` - Reject and requeue message

---

### Level 3: Advanced - Topic Exchanges

**Concept**: Pattern-based routing using topic exchanges.

**What you'll learn**:
- Topic exchanges
- Routing key patterns
- Wildcard routing (`*` and `#`)
- Multiple consumers for same messages

**Code Examples**:
- Producer: `src/rabbitmq/services/rabbitmq.service.ts` - `sendToTopicExchange()`
- Consumers: `src/rabbitmq/advanced/advanced.consumer.ts`

**Routing Patterns**:
```
payment.complete          → approved_payments queue
payment.credit.approve    → approved_payments queue
payment.refund            → refund_requests queue
payment.*                 → email_notifications (all payment events)
payment.*                 → audit_logs (all payment events)
```

**How to test**:
```bash
# Create payment
curl -X POST http://localhost:3000/api/payments \
  -H "Content-Type: application/json" \
  -d '{...}'

# This triggers:
# - payment.complete event (routed to multiple queues)
# - Email notifications
# - Audit logging
```

**Check RabbitMQ**:
- Go to "Exchanges" → `payment_events` (topic exchange)
- Go to "Queues" → See multiple queues bound with different routing keys

**Key Takeaways**:
- Topic exchange = flexible routing
- `*` = match one word
- `#` = match zero or more words
- Same message can go to multiple queues
- Powerful for microservices architectures

---

### Level 4: Expert - Dead Letter Queues & RPC

**Concept**: Production patterns for fault tolerance and synchronous communication.

**What you'll learn**:
- Dead Letter Queue (DLQ) for failed messages
- RPC pattern for synchronous responses
- Retry mechanisms with exponential backoff
- Message correlation
- Circuit breaker pattern

**Code Examples**:
- Consumer: `src/rabbitmq/expert/expert.consumer.ts`
- DLQ: `payment_processing.dlq`
- RPC: `payment_rpc` queue

**Patterns Demonstrated**:

1. **Dead Letter Queue**:
   - Failed messages after max retries go to DLQ
   - Requires manual review/alerting
   - Prevents message loss

2. **RPC Pattern**:
   - Synchronous request/response over async messaging
   - Uses correlation IDs
   - Temporary reply queue per request

3. **Retry with Backoff**:
   - Exponential backoff (2^retries seconds)
   - Max 3 retries before DLQ
   - Automatically handles transient failures

**How to test**:
```bash
# RPC Request (status check)
# In real app, this would be a synchronous call
# Here it demonstrates the RPC pattern

# Check DLQ in RabbitMQ UI
# Failed messages after retries appear here
```

**Key Takeaways**:
- DLQ = catch-all for truly failed messages
- RPC = synchronous over asynchronous
- Retry = handle transient failures
- Correlation IDs = match requests/responses
- Production-ready error handling

---

## 🛠️ Testing Scenarios

### Scenario 1: Normal Flow
```bash
# Create a small payment (< $1000)
curl -X POST http://localhost:3000/api/payments \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "orderId": "order-123",
    "amount": 50.00,
    "currency": "USD",
    "paymentMethod": "credit_card",
    "last4digits": "4242"
  }'

# Expected: Success, low fraud risk
# Check logs for processing steps
```

### Scenario 2: High-Value Transaction
```bash
# Create a large payment (> $10000)
curl -X POST http://localhost:3000/api/payments \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "orderId": "order-456",
    "amount": 15000.00,
    "currency": "USD",
    "paymentMethod": "credit_card",
    "last4digits": "4242"
  }'

# Expected: High fraud risk detection
# Slower processing due to fraud checks
```

### Scenario 3: Failed Payment
```bash
# 10% failure rate is simulated
# Keep creating payments until one fails
# Observe DLQ behavior
```

### Scenario 4: Multiple Consumers
```bash
# Start multiple app instances
npm run start:dev  # Terminal 1
npm run start:dev  # Terminal 2

# Send multiple payments
# Observe load balancing
```

---

## 📊 Monitoring in RabbitMQ UI

1. **Queues Tab**:
   - See all queues
   - Check message counts
   - Monitor consumer count
   - View message rates

2. **Exchanges Tab**:
   - See topic exchanges
   - View bindings
   - Monitor publish rates

3. **Connections Tab**:
   - Active connections
   - Channels per connection

4. **DLQ Monitoring**:
   - Check `payment_processing.dlq`
   - Review failed messages
   - Investigate failure reasons

---

## 🎓 Progressive Learning Strategy

1. **Week 1**: Master Beginner Level
   - Understand basic queuing
   - Practice creating/consuming messages
   - Use RabbitMQ UI to visualize

2. **Week 2**: Advance to Intermediate
   - Learn about durability
   - Understand acknowledgments
   - Experiment with load balancing

3. **Week 3**: Explore Advanced
   - Master topic exchanges
   - Practice routing patterns
   - Build microservices-style routing

4. **Week 4**: Achieve Expert
   - Implement DLQ
   - Build RPC patterns
   - Production-ready systems

---

## 💡 Tips for Learning

1. **Start Simple**: Don't skip levels - each builds on previous
2. **Use Management UI**: Visualize queues, messages, exchanges
3. **Experiment**: Modify routing keys, add consumers
4. **Read Logs**: App logs show what's happening at each level
5. **Monitor**: Watch queue lengths, consumer counts
6. **Fail Things**: Kill consumers, restart RabbitMQ

---

## 🚀 Next Steps

1. Add more consumers for specific scenarios
2. Implement priority queues
3. Add TTL (Time To Live) for messages
4. Experiment with clustering
5. Add monitoring (Prometheus/Grafana)
6. Implement distributed tracing

---

## 📚 Additional Resources

- [RabbitMQ Tutorials](https://www.rabbitmq.com/getstarted.html)
- [NestJS Documentation](https://docs.nestjs.com/)
- [TypeORM Guide](https://typeorm.io/)
- [amqplib Documentation](https://www.squaremobius.net/amqp.node/channel_api.html)

Happy Learning! 🎉

