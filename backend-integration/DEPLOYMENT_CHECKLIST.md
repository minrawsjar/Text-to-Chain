# Backend Integration Deployment Checklist

## ✅ Pre-Deployment

### 1. Smart Contracts (COMPLETED)
- [x] TokenXYZ deployed: `0x4d054FB258A260982F0bFab9560340d33D9E698B`
- [x] VoucherManager deployed: `0x3094e5820F911f9119D201B9E2DdD4b9cf792990`
- [x] UniswapV3PoolManager deployed: `0xd9794c0daC0382c11F6Cf4a8365a8A49690Dcfc8`
- [x] EntryPointV3 deployed: `0x6b5b8b917f3161aeb72105b988E55910e231d240`
- [x] Uniswap V3 Pool created: `0x54fB26024019504e075B98c2834adEB29E779c7e`
- [x] Initial liquidity added: 100k TXTC + 1 ETH
- [x] Permissions configured

### 2. Backend Integration Files (COMPLETED)
- [x] Contract ABIs exported
- [x] TypeScript service created (`contract-service.ts`)
- [x] Rust integration module created (`contracts/`)
- [x] Configuration files created
- [x] Example usage documented

## 🔄 Integration Steps

### Step 1: Install Dependencies

**TypeScript/Node.js:**
```bash
cd backend-integration
npm install
```

**Rust (add to Cargo.toml):**
```toml
ethers = { version = "2.0", features = ["abigen", "ws"] }
tokio = { version = "1", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }
```

### Step 2: Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your values:
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
PRIVATE_KEY=your_backend_wallet_private_key
```

### Step 3: Update SMS Handler

**For Rust backend:**

1. Add contracts module to `main.rs`:
```rust
mod contracts;
use contracts::{ContractConfig, ContractService};
```

2. Initialize service:
```rust
let contract_config = ContractConfig::from_env()?;
let contract_service = ContractService::new(contract_config).await?;
```

3. Update command handlers:
```rust
// In commands/redeem.rs
let result = contract_service.redeem_voucher(
    &code,
    user_address,
    true
).await?;
```

**For TypeScript backend:**

1. Import service:
```typescript
import { getContractService } from './backend-integration/contract-service';
```

2. Initialize:
```typescript
const service = getContractService(process.env.PRIVATE_KEY);
```

3. Use in handlers (see `example-usage.ts`)

### Step 4: Test Integration

```bash
# Test balance check
curl -X POST http://localhost:3000/test/balance \
  -H "Content-Type: application/json" \
  -d '{"address": "0xTestAddress"}'

# Test voucher redemption (with test voucher)
curl -X POST http://localhost:3000/test/redeem \
  -H "Content-Type: application/json" \
  -d '{"code": "TEST123", "address": "0xTestAddress"}'
```

### Step 5: Update Database Schema

Add contract-related fields to your database:

```sql
-- Add to users table
ALTER TABLE users ADD COLUMN last_tx_hash VARCHAR(66);
ALTER TABLE users ADD COLUMN last_tx_timestamp TIMESTAMP;

-- Create transactions table
CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  tx_hash VARCHAR(66) NOT NULL,
  tx_type VARCHAR(20) NOT NULL, -- 'redeem', 'swap', 'transfer'
  amount VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create vouchers table (if not exists)
CREATE TABLE vouchers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code VARCHAR(20) UNIQUE NOT NULL,
  amount VARCHAR(50) NOT NULL,
  shop_id INTEGER,
  redeemed_by INTEGER,
  redeemed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (redeemed_by) REFERENCES users(id)
);
```

## 🧪 Testing Checklist

### Unit Tests
- [ ] Test contract service initialization
- [ ] Test balance queries
- [ ] Test voucher redemption (mock)
- [ ] Test swap functions (mock)
- [ ] Test error handling

### Integration Tests
- [ ] Test with real Sepolia contracts
- [ ] Test full SMS flow: JOIN → DEPOSIT → REDEEM
- [ ] Test BALANCE command
- [ ] Test SWAP command
- [ ] Test error scenarios (invalid voucher, insufficient balance)

### End-to-End Tests
- [ ] Send test SMS → Receive response
- [ ] Redeem test voucher → Check balance
- [ ] Swap tokens → Verify ETH received
- [ ] Check transaction on Etherscan

## 📊 Monitoring Setup

### 1. Backend Wallet Monitoring
```bash
# Check backend wallet balance
cast balance 0xYourBackendWallet --rpc-url $RPC_URL

# Should maintain at least 0.1 ETH for gas
```

### 2. Contract Monitoring
```bash
# Pool liquidity
cast call 0xd9794c0daC0382c11F6Cf4a8365a8A49690Dcfc8 \
  "getPoolLiquidity()(uint128)" --rpc-url $RPC_URL

# Current price
cast call 0xd9794c0daC0382c11F6Cf4a8365a8A49690Dcfc8 \
  "getCurrentPrice()(uint160)" --rpc-url $RPC_URL
```

### 3. Error Logging
Set up logging for:
- Contract call failures
- Gas estimation errors
- Transaction reverts
- RPC connection issues

### 4. Alerts
Configure alerts for:
- Backend wallet balance < 0.05 ETH
- Failed transactions > 5 in 1 hour
- RPC endpoint downtime
- Pool liquidity < threshold

## 🚀 Production Deployment

### Pre-Production
- [ ] Test all SMS commands on Sepolia
- [ ] Verify gas estimates are accurate
- [ ] Test with multiple concurrent users
- [ ] Load test the backend
- [ ] Review security (private key storage, rate limiting)

### Production Launch
- [ ] Deploy backend to production server
- [ ] Configure production RPC endpoint (Alchemy/Infura)
- [ ] Set up monitoring and alerts
- [ ] Configure backup RPC endpoints
- [ ] Document incident response procedures

### Post-Launch
- [ ] Monitor first 100 transactions
- [ ] Track gas usage and costs
- [ ] Collect user feedback
- [ ] Optimize gas parameters if needed

## 🔒 Security Checklist

- [ ] Private keys stored securely (env vars, not in code)
- [ ] RPC endpoints use HTTPS
- [ ] Rate limiting on SMS endpoints
- [ ] Input validation on all user inputs
- [ ] Transaction signing happens server-side only
- [ ] User wallets encrypted in database
- [ ] Backup of encryption keys
- [ ] Regular security audits

## 📝 Documentation

- [ ] API documentation updated
- [ ] SMS command reference updated
- [ ] Error codes documented
- [ ] Troubleshooting guide created
- [ ] Team training completed

## 🎯 Success Metrics

Track these metrics post-launch:
- Total vouchers redeemed
- Average redemption time
- Swap volume (TXTC ↔ ETH)
- User retention rate
- Transaction success rate
- Average gas cost per operation

## 📞 Support

### If Issues Occur:

1. **Check Etherscan** for transaction status
2. **Review logs** for error messages
3. **Verify RPC** endpoint is responding
4. **Check gas prices** aren't too high
5. **Confirm contract** addresses are correct

### Emergency Contacts:
- Smart Contract Issues: Check Etherscan, review contract code
- Backend Issues: Check server logs, restart services
- RPC Issues: Switch to backup endpoint

## ✅ Final Checklist

Before going live:
- [ ] All tests passing
- [ ] Monitoring configured
- [ ] Alerts set up
- [ ] Documentation complete
- [ ] Team trained
- [ ] Backup plan ready
- [ ] Emergency procedures documented

---

**Status**: Ready for integration testing
**Next Step**: Update SMS handler with contract calls
**Estimated Time**: 2-3 hours for full integration
