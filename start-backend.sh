#!/bin/bash

# Start Backend Services for Text-to-Chain
# This script starts both the Contract API and SMS Handler

set -e

echo "🚀 Starting Text-to-Chain Backend Services"
echo "=========================================="

# Check if .env files exist
if [ ! -f "backend-integration/.env" ]; then
    echo "❌ Error: backend-integration/.env not found"
    echo "   Copy from .env.example and configure"
    exit 1
fi

if [ ! -f "sms-request-handler/.env" ]; then
    echo "❌ Error: sms-request-handler/.env not found"
    echo "   Copy from .env.example and configure"
    exit 1
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down Contract API..."
    kill $CONTRACT_API_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start Contract API (Port 3000)
echo ""
echo "1️⃣ Starting Contract API Server (Port 3000)..."
cd backend-integration
npm start > ../logs/contract-api.log 2>&1 &
CONTRACT_API_PID=$!
cd ..

sleep 3

# Check if Contract API started
if curl -s http://localhost:3000/health > /dev/null; then
    echo "   ✅ Contract API running on http://localhost:3000"
else
    echo "   ❌ Contract API failed to start"
    cat logs/contract-api.log
    exit 1
fi

echo ""
echo "ℹ️  SMS Handler not started (run manually if needed)"
echo "   To start: cd sms-request-handler && cargo run"

echo ""
echo "=========================================="
echo "✅ Contract API Running!"
echo "=========================================="
echo ""
echo "📡 Service:"
echo "   Contract API:  http://localhost:3000"
echo ""
echo "📋 Endpoints:"
echo "   POST http://localhost:3000/api/redeem   - Redeem voucher"
echo "   GET  http://localhost:3000/api/balance/:address - Get balance"
echo "   POST http://localhost:3000/api/swap     - Swap tokens"
echo "   POST http://localhost:3000/api/send     - Send tokens"
echo "   GET  http://localhost:3000/api/price    - Get pool price"
echo ""
echo "📝 Logs:"
echo "   Contract API: logs/contract-api.log"
echo ""
echo "ℹ️  To start SMS Handler separately:"
echo "   cd sms-request-handler && cargo run --release"
echo ""
echo "Press Ctrl+C to stop Contract API"
echo ""

# Wait for processes
wait
