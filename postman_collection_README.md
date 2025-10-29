# Postman Collection Guide

This guide explains how to use the Postman collection for testing the E-Commerce Payment Processing API.

## Importing the Collection

1. Open Postman
2. Click "Import" button
3. Select the `postman_collection.json` file
4. The collection will be added to your workspace

## Environment Setup

The collection uses the following variables:

- `base_url`: Set to `http://localhost:3000` by default

To modify the base URL:

1. Click on the collection name
2. Go to the "Variables" tab
3. Update the `base_url` value

## API Endpoints

### 1. Create Payment (POST /api/payments)

Creates a new payment transaction and queues it for processing via RabbitMQ.

**Request Body:**

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440001",
  "orderId": "650e8400-e29b-41d4-a716-446655440002",
  "amount": 50.0,
  "currency": "USD",
  "paymentMethod": "credit_card",
  "last4digits": "4242",
  "description": "Test payment transaction"
}
```

**Payment Methods:**

- `credit_card`
- `debit_card`
- `bank_transfer`

**Response:** Returns the created payment with status `pending` or `processing`

### 2. Get All Payments (GET /api/payments)

Retrieves all payment transactions.

**Response:** Array of payment objects

### 3. Get Payment by ID (GET /api/payments/:id)

Retrieves a specific payment by its ID.

**Response:** Single payment object

### 4. Refund Payment (PATCH /api/payments/:id/refund)

Processes a refund for a payment.

**Request Body (for partial refund):**

```json
{
  "amount": 25.0
}
```

**Request Body (for full refund):**

```json
{}
```

## Testing Scenarios

The collection includes example requests for different scenarios:

### 1. Small Payment (< $1000)

- Amount: $50
- Fraud Risk: Low
- Processes quickly through the queue

### 2. Medium Payment ($1000-$10000)

- Amount: $5000
- Fraud Risk: Medium
- Requires additional verification time

### 3. Large Payment (> $10000)

- Amount: $15000
- Fraud Risk: High
- Goes through extended verification process

### 4. Full Refund

- Refunds the entire payment amount
- No amount field required

### 5. Partial Refund

- Refunds only a specified amount
- Requires amount field in request body

## Automatic Test Scripts

Each request includes automatic test scripts that:

- Verify HTTP status codes
- Check response structure
- Validate expected data fields

## Payment Status Flow

1. **pending** - Payment created, awaiting processing
2. **processing** - Payment is being processed
3. **completed** - Payment successfully processed
4. **failed** - Payment processing failed
5. **refunded** - Payment has been refunded

## Using Variables

The collection automatically saves the payment ID from the "Create Payment" response and uses it in subsequent requests:

- `{{paymentId}}` - Automatically populated after creating a payment

## RabbitMQ Monitoring

While testing with Postman, you can monitor the RabbitMQ processing:

1. Access RabbitMQ Management UI: http://localhost:15672
2. Username: `admin`
3. Password: `admin123`
4. Monitor queues in real-time:
   - Beginner queue
   - Intermediate queue
   - Advanced queue
   - Expert queue

## Best Practices

1. **Start with Create Payment** - Create a payment first to get a valid ID
2. **Check RabbitMQ UI** - Monitor how payments flow through different queues
3. **Run in sequence** - Some requests depend on previously created payments
4. **Monitor logs** - Check the application logs to see queue processing

## Troubleshooting

### Connection Error

- Ensure the application is running: `npm run start:dev`
- Verify the base URL is correct
- Check if the server is listening on the expected port

### 404 Not Found

- Ensure you're using the correct API path: `/api/payments`
- Check the global prefix in `main.ts`

### 400 Bad Request

- Verify UUID format for userId and orderId
- Check that amount is a positive number (minimum 0.01)
- Ensure paymentMethod is a valid enum value

### Payment Not Processing

- Check RabbitMQ is running: `docker-compose ps`
- Verify RabbitMQ connection in application logs
- Monitor RabbitMQ Management UI for queue activity

## Additional Resources

- See `examples/test-payment.sh` for bash script examples
- Check `USAGE.md` for detailed usage instructions
- Review `LEARNING_GUIDE.md` for RabbitMQ learning progression
