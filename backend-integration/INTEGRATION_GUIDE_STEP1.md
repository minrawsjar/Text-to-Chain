# Step 1: Integrate REDEEM Command with Smart Contracts

## What We're Doing

Updating the REDEEM command to call the deployed `EntryPointV3` contract instead of just updating the database.

## Current Flow (Database Only)

```
User: "REDEEM ABC123"
  ↓
1. Check voucher in database
2. Mark as redeemed
3. Update user balance in DB
4. Send SMS: "Voucher redeemed!"
```

**Problem**: No actual tokens are minted, no blockchain transaction happens.

## New Flow (With Smart Contracts)

```
User: "REDEEM ABC123"
  ↓
1. Check voucher in database
2. Call EntryPointV3.redeemVoucher(code, userAddress, true)
3. Smart contract:
   - Calls VoucherManager to mint tokens
   - Auto-swaps tokens to ETH via Uniswap V3
   - Sends ETH to user's wallet
4. Wait for transaction confirmation
5. Update database (mark voucher as redeemed)
6. Send SMS: "✅ Received 0.05 ETH! TX: 0x..."
```

## Implementation Options

### Option A: TypeScript/Node.js Backend (Recommended)

If your SMS handler can call a TypeScript service:

**1. Create an API endpoint:**

```typescript
// backend-integration/api-server.ts
import express from 'express';
import { getContractService } from './contract-service';
import * as dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const contractService = getContractService(process.env.PRIVATE_KEY!);

// REDEEM endpoint
app.post('/api/redeem', async (req, res) => {
  try {
    const { voucherCode, userAddress } = req.body;
    
    const result = await contractService.redeemVoucher(
      voucherCode,
      userAddress,
      true // auto-swap to ETH
    );
    
    res.json({
      success: true,
      tokenAmount: result.tokenAmount,
      ethAmount: result.ethAmount,
      txHash: result.txHash,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.listen(3000, () => {
  console.log('Contract API running on port 3000');
});
```

**2. Call from Rust SMS handler:**

```rust
// In parser.rs redeem_response function
async fn redeem_response(&self, from: &str, code: &str) -> String {
    // Get user wallet address
    let user = match self.user_repo.as_ref().unwrap().find_by_phone(from).await {
        Ok(Some(u)) => u,
        _ => return "No wallet. Reply JOIN.".to_string(),
    };

    // Call TypeScript API
    let client = reqwest::Client::new();
    let response = client
        .post("http://localhost:3000/api/redeem")
        .json(&serde_json::json!({
            "voucherCode": code,
            "userAddress": user.wallet_address,
        }))
        .send()
        .await;

    match response {
        Ok(resp) => {
            let data: serde_json::Value = resp.json().await.unwrap();
            if data["success"].as_bool().unwrap_or(false) {
                let eth_amount = data["ethAmount"].as_str().unwrap_or("0");
                let tx_hash = data["txHash"].as_str().unwrap_or("");
                
                // Update database
                let _ = self.voucher_repo.as_ref().unwrap().redeem(code, from).await;
                
                format!("✅ Voucher redeemed!\n\nReceived: {} ETH\nTX: {}", eth_amount, tx_hash)
            } else {
                format!("❌ {}", data["error"].as_str().unwrap_or("Redemption failed"))
            }
        }
        Err(e) => format!("❌ Error: {}", e),
    }
}
```

### Option B: Pure Rust (Advanced)

Use the Rust contract integration module we created:

```rust
// Add to Cargo.toml
[dependencies]
ethers = { version = "2.0", features = ["abigen", "ws"] }
tokio = { version = "1", features = ["full"] }

// In parser.rs
use crate::contracts::{ContractConfig, ContractService};

async fn redeem_response(&self, from: &str, code: &str) -> String {
    // Initialize contract service
    let config = ContractConfig::from_env().unwrap();
    let contract_service = ContractService::new(config).await.unwrap();
    
    // Get user
    let user = match self.user_repo.as_ref().unwrap().find_by_phone(from).await {
        Ok(Some(u)) => u,
        _ => return "No wallet. Reply JOIN.".to_string(),
    };
    
    let user_address = user.wallet_address.parse().unwrap();
    
    // Call contract
    match contract_service.redeem_voucher(code, user_address, true).await {
        Ok(result) => {
            // Update database
            let _ = self.voucher_repo.as_ref().unwrap().redeem(code, from).await;
            
            format!(
                "✅ Voucher redeemed!\n\nReceived: {} ETH\nTX: {}",
                result.eth_amount,
                result.tx_hash
            )
        }
        Err(e) => format!("❌ Error: {}", e),
    }
}
```

## Quick Start: TypeScript API Approach

**1. Start the contract API server:**

```bash
cd backend-integration
npm install express
npm install --save-dev @types/express

# Create api-server.ts (code above)
ts-node api-server.ts
```

**2. Update Rust SMS handler:**

Add to `Cargo.toml`:
```toml
reqwest = { version = "0.11", features = ["json"] }
serde_json = "1.0"
```

**3. Test it:**

```bash
# Terminal 1: Start API server
cd backend-integration
ts-node api-server.ts

# Terminal 2: Test the endpoint
curl -X POST http://localhost:3000/api/redeem \
  -H "Content-Type: application/json" \
  -d '{
    "voucherCode": "TEST123",
    "userAddress": "0xYourTestAddress"
  }'
```

## What Happens When User Sends "REDEEM ABC123"

1. **SMS received** → Twilio → Your Rust backend
2. **Rust backend** → Calls TypeScript API at `localhost:3000/api/redeem`
3. **TypeScript API** → Calls `EntryPointV3.redeemVoucher()` on Sepolia
4. **Smart Contract**:
   - Verifies voucher code
   - Mints tokens to user
   - Auto-swaps to ETH via Uniswap V3
   - Sends ETH to user's wallet
5. **Transaction confirmed** → Returns to TypeScript API
6. **TypeScript API** → Returns result to Rust backend
7. **Rust backend** → Updates database, sends SMS to user

## Testing

```bash
# 1. Create a test voucher in your database
# 2. Send SMS: "REDEEM TEST123"
# 3. Check transaction on Etherscan
# 4. Verify user received ETH
```

## Next Steps

Once REDEEM works:
- ✅ Step 1: REDEEM (current)
- ⏳ Step 2: BALANCE (read from blockchain)
- ⏳ Step 3: SWAP (swap tokens for ETH)
- ⏳ Step 4: SEND (transfer tokens)

## Files Created

- `backend-integration/redeem_integration.rs` - Rust implementation
- `backend-integration/INTEGRATION_GUIDE_STEP1.md` - This guide
- Ready to create: `api-server.ts` - TypeScript API server

Choose your approach and let's implement it!
