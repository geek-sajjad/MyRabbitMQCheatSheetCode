#!/bin/bash

# Payment Processing System - Test Script
# This script demonstrates different payment scenarios

API_URL="http://localhost:3000/api/payments"

echo "🎉 Testing Payment Processing System with RabbitMQ"
echo "=================================================="
echo ""

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Small payment (< $1000) - Low fraud risk
echo -e "${BLUE}Test 1: Small Payment (Low Fraud Risk)${NC}"
curl -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "orderId": "order-001",
    "amount": 50.00,
    "currency": "USD",
    "paymentMethod": "credit_card",
    "last4digits": "4242"
  }'
echo ""
echo ""

# Test 2: Medium payment (Medium fraud risk)
echo -e "${BLUE}Test 2: Medium Payment (Medium Fraud Risk)${NC}"
curl -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-456",
    "orderId": "order-002",
    "amount": 5000.00,
    "currency": "USD",
    "paymentMethod": "debit_card",
    "last4digits": "1234"
  }'
echo ""
echo ""

# Test 3: Large payment (> $10000) - High fraud risk
echo -e "${YELLOW}Test 3: Large Payment (High Fraud Risk)${NC}"
curl -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-789",
    "orderId": "order-003",
    "amount": 15000.00,
    "currency": "USD",
    "paymentMethod": "credit_card",
    "last4digits": "5555"
  }'
echo ""
echo ""

# Test 4: Get all payments
echo -e "${GREEN}Test 4: Fetching All Payments${NC}"
curl -X GET $API_URL
echo ""
echo ""

echo "✅ Tests completed!"
echo ""
echo "📊 Check RabbitMQ Management UI: http://localhost:15672"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "💡 Check application logs to see queue processing at different levels:"
echo "   - 🎓 [BEGINNER] - Basic queue"
echo "   - 🎓 [INTERMEDIATE] - Work queues with fraud detection"
echo "   - 🎓 [ADVANCED] - Topic exchange events"
echo "   - 🎓 [EXPERT] - RPC and DLQ handling"

