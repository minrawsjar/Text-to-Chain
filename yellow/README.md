# Yellow Network Integration for Text-to-Chain

> **Enabling cost-efficient, instant token transfers for SMS-based DeFi**

The Yellow Network integration brings state channel technology to Text-to-Chain's SMS-based payment system, reducing gas costs by up to 67% while maintaining instant settlement. Users can send TXTC tokens via simple SMS commands like `SEND 10 TXTC TO alice.ttcip.eth`, and transactions are automatically batched for maximum efficiency.

**Part of the [Text-to-Chain](../README.md) SMS-based DeFi platform - bringing Web3 to 2.5 billion feature phone users.**

---

### Why Yellow Network for SMS Payments?

**The Problem:** Traditional blockchain transfers are expensive and slow
- Each SMS payment (`SEND 10 TXTC TO alice`) requires on-chain transaction
- Gas costs: ~0.003 ETH (~$9) per transfer
- Wait time: 15+ seconds for confirmation
- **Result:** Prohibitively expensive for feature phone users in developing countries

**The Yellow Network Solution:** Batch processing with state channels
- Queue multiple SMS payments from different users
- Open single Yellow Network state channel every 3 minutes
- Process all transfers **off-chain** with instant finality
- Close channel and settle on-chain once
- **Result:** 67-90% cost reduction, instant confirmation for users

### How State Channels Work

```
Traditional Approach (10 payments):
┌─────────────────────────────────────────┐
│ Payment 1: Open channel → Transfer → Close = 0.006 ETH │
│ Payment 2: Open channel → Transfer → Close = 0.006 ETH │
│ Payment 3: Open channel → Transfer → Close = 0.006 ETH │
│ ... (7 more payments)                   │
│ Total: 0.06 ETH (~$180)                │
└─────────────────────────────────────────┘

Yellow Network Batch (10 payments):
┌─────────────────────────────────────────┐
│ Open channel once        = 0.003 ETH   │
│ Transfer 1 (off-chain)   = 0 ETH       │
│ Transfer 2 (off-chain)   = 0 ETH       │
│ ... (8 more off-chain)                  │
│ Close & settle on-chain  = 0.003 ETH   │
│ Total: 0.006 ETH (~$18)                │
│ 💰 Savings: $162 (90%)                  │
└─────────────────────────────────────────┘
```

📚 **Learn More:**
- [Yellow Network Docs](https://docs.yellow.org/docs)
- [State Channels Explained](https://docs.yellow.org/docs/concepts/state-channels)
- [Nitrolite SDK](https://github.com/erc7824/nitrolite)

---

## 🎯 Key Features

### ⚡ Automatic SMS Payment Batching
- Users send `SEND 10 TXTC TO alice` via SMS
- Transactions automatically queued in memory
- Processed every 3 minutes in efficient batches
- SMS confirmation: "✅ Transfer queued! Processing within 3 minutes"

### 💰 Massive Cost Reduction
- **67% lower gas costs** for typical batch sizes (5-10 payments)
- **90% savings** for large batches (50+ payments)
- Single channel open/close for unlimited transfers
- Example: 100 SMS payments for the cost of 2 on-chain transactions

### 🚀 Instant User Experience
- Immediate SMS acknowledgment when payment queued
- Off-chain transfers complete in milliseconds
- No blockchain confirmation delays
- SMS notification when batch settles: "✅ 10 TXTC sent to alice.ttcip.eth"

### 🔄 Automatic Settlement
- On-chain TXTC token minting to recipients
- Auto-withdrawal of remaining funds
- Transparent custody management
- SMS notifications to all batch participants

### 📡 REST API for Integration
- Queue transactions: `POST /api/yellow/send`
- Check status: `GET /api/yellow/status`
- View pending: `GET /api/yellow/pending`
- Easy integration with SMS handler and other services

---

## 🏗️ Architecture in Text-to-Chain Ecosystem

```
┌──────────────────────────────────────────────────────────────┐
│                    USER LAYER (Feature Phones)               │
│  "SEND 10 TXTC TO alice"  →  SMS  →  Twilio                  │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│        SMS REQUEST HANDLER (Rust, Port 8080)                 │
│  • Parse "SEND" command                                      │
│  • Resolve recipient (alice → alice.ttcip.eth → 0x...)       │
│                                                              │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│      YELLOW NETWORK BATCH SERVICE (TypeScript, Port 8083)    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  Transaction Queue (In-Memory)                       │    │
│  │  • +919876543210: 10 TXTC → alice.ttcip.eth         │     │
│  │  • +918595057429: 5 TXTC → bob.ttcip.eth            │     │
│  │  • +917766554433: 20 TXTC → charlie.ttcip.eth       │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  Batch Processor (3-minute intervals)                │    │
│  │  1. Check queue (min 1 transaction)                  │    │
│  │  2. Open Yellow Network state channel                │    │
│  │  3. Process ALL transfers off-chain                  │    │
│  │  4. Close channel & settle on-chain                  │    │
│  │  5. Mint TXTC to recipients (Sepolia)               │     │
│  │  6. Send SMS notifications via backend               │    │
│  └─────────────────────────────────────────────────────┘     │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────── ──────────── ┐
│           YELLOW NETWORK (Nitrolite SDK)                       │
│  • WebSocket: wss://clearnet-sandbox.yellow.com/ws             │
│  • Custody Address: 0x019B65A265EB3363822f2752141b3dF16131b262 │
│  • Asset: weth                  │
│  • Off-chain state channel transfers                           │
└────────────────────────┬────────────────────── ───────────── ──┘
                         │
                         ▼
┌──────────────────────────────────────────��───────────────────┐
│              ETHEREUM SEPOLIA TESTNET                         │
│  • TXTC Token: 0x0F0E4A3F59C3B8794A9044a0dC0155fB3C3fA223     │
│  • ENS Registrar: 0xcD057A8AbF3832e65edF5d224313c6b4e6324F76  │
│  • On-chain settlement mints TXTC to recipients               │
└────────────────────────────────────────── ───────────────── ──┘
```
---

## Quick Start

### 1. Install Dependencies

```bash
cd yellow
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Required variables:
```env
PRIVATE_KEY=0x...                    # Your wallet private key
ALCHEMY_RPC_URL=https://...          # Sepolia RPC URL
PORT=8083                             # API server port (optional)
```

### 3. Run the Service

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## API Usage

### Queue a Transaction

```bash
POST http://localhost:8083/api/yellow/send
Content-Type: application/json

{
  "recipientAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "amount": "10",
  "userPhone": "+918595057429"
}
```

**Response:**
```json
{
  "success": true,
  "transactionId": "tx_1738842123_abc123",
  "message": "Transaction queued for next batch",
  "estimatedProcessing": "Within 3 minutes"
}
```

### Check Service Status

```bash
GET http://localhost:8083/api/yellow/status
```

**Response:**
```json
{
  "success": true,
  "sessionActive": true,
  "pendingTransactions": 5,
  "channelId": "0xabc123...",
  "sessionDuration": 45000
}
```

### View Pending Transactions

```bash
GET http://localhost:8083/api/yellow/pending
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "transactions": [
    {
      "id": "tx_1738842123_abc123",
      "recipientAddress": "0x742d35Cc...",
      "amount": "10",
      "asset": "ytest.usd",
      "userPhone": "+918595057429",
      "timestamp": 1738842123456
    }
  ]
}
```

## Integration with SMS Handler

Update your SMS handler to use Yellow Network for SEND commands:

### Backend Integration (`api-server.ts`)

```typescript
// Add Yellow endpoint
app.post("/api/send-yellow", async (req, res) => {
  try {
    const { recipientAddress, amount, userPhone } = req.body;

    // Queue transaction with Yellow batch service
    const response = await fetch("http://localhost:8083/api/yellow/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientAddress, amount, userPhone }),
    });

    const result = await response.json();

    // Send immediate SMS confirmation
    if (twilioClient && result.success) {
      await twilioClient.messages.create({
        body: `✅ Transfer queued!\n\n${amount} USDC → ${recipientAddress.slice(0, 10)}...\n\nProcessing in next batch (max 3 mins)`,
        from: twilioPhoneNumber,
        to: userPhone,
      });
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

### SMS Handler (`parser.rs`)

```rust
async fn send_response(&self, from: &str, amount: f64, recipient: &str) -> String {
    // Resolve recipient address
    let to_address = self.resolve_recipient(recipient).await;
    
    // Queue with Yellow batch service
    let client = reqwest::Client::new();
    let response = client
        .post("http://localhost:3000/api/send-yellow")
        .json(&serde_json::json!({
            "recipientAddress": to_address,
            "amount": amount.to_string(),
            "userPhone": from
        }))
        .send()
        .await?;

    if response.status().is_success() {
        format!(
            "Transfer queued!\n\n{} USDC → {}\n\nProcessing in next batch.",
            amount, recipient
        )
    } else {
        "Transfer failed. Try later.".to_string()
    }
}
```

## How Batching Works

### Timeline Example

```
00:00 - Service starts, waiting for transactions
00:30 - User A sends 10 USDC (queued)
01:15 - User B sends 5 USDC (queued)
02:45 - User C sends 20 USDC (queued)
03:00 - ⚡ BATCH STARTS
        - Open Yellow channel
        - Fund with 35 USDC + buffer
        - Process A's transaction (10 USDC)
        - Process B's transaction (5 USDC)
        - Process C's transaction (20 USDC)
        - Close channel
        - Withdraw remaining funds
03:45 - ✅ BATCH COMPLETE
        - SMS notifications sent to A, B, C
06:00 - Next batch window opens
```

### Benefits vs Individual Transactions

**Individual Transactions:**
- 3 channel opens = 3 on-chain txs
- 3 channel closes = 3 on-chain txs
- Total: 6 on-chain transactions
- Gas cost: ~0.003 ETH × 6 = 0.018 ETH

**Batch Processing:**
- 1 channel open = 1 on-chain tx
- 1 channel close = 1 on-chain tx
- Total: 2 on-chain transactions
- Gas cost: ~0.003 ETH × 2 = 0.006 ETH
- **Savings: 67% reduction in gas costs**

## Configuration

### Adjust Batch Timing

Edit `batch-service.ts`:

```typescript
const SESSION_DURATION_MS = 3 * 60 * 1000; // 3 minutes
const MIN_TRANSACTIONS_TO_OPEN = 1;        // Min transactions to trigger batch
```

**Options:**
- `1 minute` - Faster processing, more frequent sessions
- `5 minutes` - Better batching, fewer sessions
- `10 minutes` - Maximum efficiency, longer wait times

### Minimum Transactions

```typescript
const MIN_TRANSACTIONS_TO_OPEN = 5; // Wait for at least 5 transactions
```

This prevents opening a session for just 1-2 transactions.

## Monitoring

### Service Logs

```bash
# Watch logs in real-time
npm run dev

# Example output:
🟡 Yellow Batch Service initialized
   Wallet: 0xc5b7b574EE84A9B59B475FE32Eaf908C246d3859
   Token: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
🔄 Starting batch loop (sessions every 180s)

📥 Queued transaction tx_123: 10 to 0x742d35Cc...
   Queue size: 1

💤 No transactions pending (checked at 10:30:00)

📥 Queued transaction tx_456: 5 to 0x8a9b7c...
   Queue size: 2

🚀 Opening new session (2 transactions pending)
🔐 Session Key: 0x9f8e7d...
🔗 Connected to Yellow Network
✓ Authenticated
✓ Channel created: 0xabc123...
✓ Channel funded
💸 Processing 2 transactions...
  → 10 to 0x742d35Cc...
  → 5 to 0x8a9b7c...
✓ Transfer 1 complete
✓ Transfer 2 complete
✅ All transactions complete!
🔒 Closing channel...
✓ Channel closed
💰 Withdrawing 5 from custody...
✓ Withdrawal complete
✅ Session complete!
```

### Health Check

```bash
curl http://localhost:8083/health
```

### Prometheus Metrics (Future)

```typescript
// Add metrics endpoint
app.get("/metrics", (req, res) => {
  const metrics = {
    total_transactions_processed: 1234,
    average_batch_size: 5.2,
    sessions_opened: 238,
    total_gas_saved: "0.45 ETH",
  };
  res.json(metrics);
});
```

## Troubleshooting

### Issue: Transactions Not Processing

**Check:**
1. Service is running: `curl http://localhost:8083/health`
2. Pending transactions: `curl http://localhost:8083/api/yellow/pending`
3. Session status: `curl http://localhost:8083/api/yellow/status`

**Fix:**
```bash
# Restart service
npm run dev
```

### Issue: Channel Creation Fails

**Check:**
- Wallet has sufficient ETH for gas
- Yellow Network is accessible
- Token address is correct

**Fix:**
```bash
# Check wallet balance
cast balance 0xYourWalletAddress --rpc-url https://1rpc.io/sepolia

# Test Yellow connection
curl -X POST https://clearnet-sandbox.yellow.com/ws
```

### Issue: Transactions Stuck in Queue

**Possible causes:**
- MIN_TRANSACTIONS_TO_OPEN not reached
- Session already active
- Service crashed

**Fix:**
```bash
# Check status
curl http://localhost:8083/api/yellow/status

# If stuck, restart service
npm run dev
```

## Production Deployment

### 1. Use PM2

```bash
npm run build
pm2 start dist/api-server.js --name yellow-batch
pm2 save
pm2 startup
```

### 2. Environment Variables

```bash
# Production .env
PRIVATE_KEY=0x...
ALCHEMY_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
PORT=8083
NODE_ENV=production
```

### 3. Monitoring

```bash
# View logs
pm2 logs yellow-batch

# Monitor metrics
pm2 monit
```

### 4. Backup & Recovery

```bash
# Backup pending transactions (if service crashes)
curl http://localhost:8083/api/yellow/pending > pending_backup.json

# Restore after restart (manual requeue)
```

## Advanced Usage

### Custom Batch Logic

```typescript
// Process high-priority transactions immediately
if (transaction.priority === "high") {
  await processImmediately(transaction);
} else {
  await queueForBatch(transaction);
}
```

### Multi-Token Support

```typescript
// Queue different assets
batchService.queueTransaction(
  recipientAddress,
  amount,
  userPhone,
  "ytest.eth" // ETH instead of USDC
);
```

### Notification Webhooks

```typescript
// Notify external service when batch completes
await fetch("https://your-api.com/webhook/batch-complete", {
  method: "POST",
  body: JSON.stringify({
    batchId: "batch_123",
    transactionsProcessed: 5,
    timestamp: Date.now(),
  }),
});
```

## Support

- Yellow Network Docs: https://docs.yellow.org
- Nitrolite SDK: https://github.com/erc7824/nitrolite
- Issues: Open GitHub issue

## License

MIT
