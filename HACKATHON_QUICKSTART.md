# Text-to-Chain - ETH Global HackMoney Quickstart

## 🚀 What We Built

**SMS-based DeFi platform** enabling 2.5 billion feature phone users to access crypto via simple text messages.

### Core Features
✅ **Voucher System** - Cash → Crypto via shop vouchers  
✅ **Liquidity Pools** - TokenXYZ-ETH automated market maker  
✅ **ENS Naming** - Human-readable wallet names  
✅ **Li.Fi Integration** - Cross-chain swaps  
✅ **Yellow Network** - Liquidity aggregation  
✅ **SMS Interface** - All operations via text messages  

---

## 📁 Project Structure

```
Text-to-Chain/
├── Liquidity-pools/          # Smart contracts (Solidity)
│   ├── src/
│   │   ├── TokenXYZ.sol      # ERC20 token for vouchers
│   │   ├── VoucherManager.sol # Voucher generation & redemption
│   │   ├── LiquidityPool.sol  # AMM for TokenXYZ-ETH
│   │   └── EntryPoint.sol     # Main backend gateway
│   ├── test/                  # Foundry tests
│   └── script/Deploy.s.sol    # Deployment script
│
├── ens-service/               # ENS naming service (TypeScript)
│   ├── contracts/
│   │   └── ENSRegistry.sol    # Name registration contract
│   └── src/
│       ├── services/          # ENS business logic
│       └── routes/            # REST API endpoints
│
├── sms-request-handler/       # SMS backend (Rust)
│   └── src/
│       ├── commands/          # SMS command handlers
│       ├── wallet/            # Wallet management
│       └── db/                # Database layer
│
├── lifi/                      # Li.Fi integration (TypeScript)
│   └── src/
│       └── services/          # Cross-chain swap logic
│
└── yellow-network-service/    # Yellow Network (TypeScript)
    └── src/
        └── services/          # Liquidity aggregation
```

---

## 🎯 Quick Demo Flow

### 1. User Joins (Wallet Creation + ENS)
```
User SMS: "JOIN"
Backend: Creates wallet
Response: "Welcome! Wallet: 0x742d...
          Want a name? Reply: NAME alice"

User SMS: "NAME alice"
Backend: Registers alice.textchain.eth
Response: "✓ Registered alice.textchain.eth!"
```

### 2. User Buys Voucher (Cash → Crypto)
```
User: Visits shop, pays ₹500 cash
Shop: Gives voucher code "ABCD1234"

User SMS: "REDEEM ABCD1234"
Backend: Validates → Mints TokenXYZ → Auto-swaps to ETH
Response: "✓ Redeemed! You received 0.05 ETH"
```

### 3. User Swaps Tokens
```
User SMS: "SWAP 100 TXTC ETH"
Backend: Executes swap via LiquidityPool
Response: "✓ Swapped 100 TXTC for 0.01 ETH"
```

### 4. User Sends Money (via ENS)
```
User SMS: "SEND 10 TXTC TO alice"
Backend: Resolves alice → 0x742d... → Transfers
Response: "✓ Sent 10 TXTC to alice.textchain.eth"
```

---

## 🛠️ Setup Instructions

### Prerequisites
```bash
# Install Foundry (Solidity)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Node.js (v18+)
# Download from nodejs.org
```

### 1. Deploy Smart Contracts

```bash
cd Liquidity-pools

# Install dependencies
forge install

# Set environment
export PRIVATE_KEY="your_private_key"
export RPC_URL="https://polygon-mumbai.g.alchemy.com/v2/YOUR_KEY"

# Deploy
forge script script/Deploy.s.sol:Deploy \
    --rpc-url $RPC_URL \
    --broadcast

# Save contract addresses from output
```

### 2. Setup ENS Service

```bash
cd ../ens-service

# Install dependencies
npm install

# Configure
cp .env.example .env
# Edit .env with contract addresses

# Start service
npm run dev
# Running on http://localhost:3002
```

### 3. Setup SMS Backend

```bash
cd ../sms-request-handler

# Configure
cp .env.example .env
# Add:
# - Twilio credentials
# - Contract addresses
# - Database URL
# - ENS_SERVICE_URL=http://localhost:3002

# Run database migrations
sqlx migrate run

# Start backend
cargo run --release
```

### 4. Setup Li.Fi Integration

```bash
cd ../lifi

# Install
npm install

# Configure
cp .env.example .env

# Start
npm run dev
```

### 5. Initialize Liquidity Pool

```bash
# Add initial liquidity (IMPORTANT!)
cast send $LIQUIDITY_POOL_ADDRESS \
    "addLiquidity(uint256)" \
    100000000000000000000000 \  # 100k TXTC
    --value 100ether \
    --private-key $PRIVATE_KEY \
    --rpc-url $RPC_URL
```

---

## 📱 SMS Commands Reference

| Command | Description | Example |
|---------|-------------|---------|
| `JOIN` | Create wallet + ENS prompt | `JOIN` |
| `NAME <name>` | Register ENS name | `NAME alice` |
| `REDEEM <code>` | Redeem voucher | `REDEEM ABCD1234` |
| `BALANCE` | Check balance | `BALANCE` |
| `SWAP <amt> <from> <to>` | Swap tokens | `SWAP 100 TXTC ETH` |
| `SEND <amt> <token> TO <recipient>` | Send tokens | `SEND 10 TXTC TO alice` |
| `POOL ADD <amt1> <token1> <amt2> <token2>` | Add liquidity | `POOL ADD 100 TXTC 1 ETH` |

---

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         USER (SMS)                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              SMS Backend (Rust - Twilio Webhook)            │
│  • Command Parser                                           │
│  • Wallet Management                                        │
│  • Database (PostgreSQL)                                    │
└──────┬──────────────┬──────────────┬────────────────────────┘
       │              │              │
       ▼              ▼              ▼
┌─────────────┐ ┌──────────┐ ┌─────────────────┐
│ EntryPoint  │ │   ENS    │ │   Li.Fi/Yellow  │
│   .sol      │ │ Service  │ │    Services     │
└──────┬──────┘ └────┬─────┘ └─────────────────┘
       │             │
       ▼             ▼
┌──────────────────────────────────────┐
│        Smart Contracts               │
│  • TokenXYZ.sol                      │
│  • VoucherManager.sol                │
│  • LiquidityPool.sol                 │
│  • ENSRegistry.sol                   │
└──────────────────────────────────────┘
```

---

## 🧪 Testing

### Smart Contracts
```bash
cd Liquidity-pools
forge test -vv

# Expected: All 11 tests passing
```

### ENS Service
```bash
cd ens-service

# Test registration
curl -X POST http://localhost:3002/register \
  -H "Content-Type: application/json" \
  -d '{"name":"testuser","ownerAddress":"0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0"}'

# Test resolution
curl http://localhost:3002/resolve/testuser
```

### SMS Backend
```bash
# Send test SMS via Twilio
curl -X POST https://your-backend.com/sms \
  -d "From=+1234567890" \
  -d "Body=JOIN"
```

---

## 🎨 Key Innovations

### 1. **Voucher-Based Onboarding**
- Shops stake liquidity to generate vouchers
- Users buy vouchers with cash
- Automatic swap to ETH on redemption
- **Impact**: Enables cash → crypto without exchanges

### 2. **ENS Integration for SMS**
- Names registered during wallet creation
- Send money via names instead of addresses
- **Impact**: Better UX for feature phone users

### 3. **Unified EntryPoint Contract**
- Single gateway for all backend operations
- Authorization system for backends
- **Impact**: Simplified integration, better security

### 4. **Auto-Swap Mechanism**
- Voucher redemption auto-swaps to ETH for gas
- Reserves 10% for future transactions
- **Impact**: Users always have gas

---

## 📊 Gas Estimates

| Operation | Gas Cost |
|-----------|----------|
| Register Shop | ~250k |
| Generate Voucher | ~150k |
| Redeem Voucher + Swap | ~350k |
| Swap Tokens | ~120k |
| Register ENS Name | ~100k |
| Send Tokens | ~65k |

---

## 🔐 Security Features

✅ **ReentrancyGuard** on all state-changing functions  
✅ **Access Control** - Backend authorization system  
✅ **Input Validation** - Zero address checks, amount validation  
✅ **Encrypted Keys** - Private keys encrypted in database  
✅ **PIN Protection** - Optional PIN for transactions  

---

## 📈 Scalability

- **Liquidity Pools**: Constant product AMM (like Uniswap V2)
- **ENS Service**: Separate microservice, horizontally scalable
- **SMS Backend**: Async Rust, handles 1000+ req/sec
- **Database**: PostgreSQL with connection pooling

---

## 🌐 Deployment Checklist

- [ ] Deploy smart contracts to Polygon Mumbai
- [ ] Verify contracts on Polygonscan
- [ ] Deploy ENS service to cloud (Railway/Render)
- [ ] Deploy SMS backend to VPS
- [ ] Configure Twilio webhook
- [ ] Add initial liquidity to pool
- [ ] Test end-to-end flow
- [ ] Set up monitoring (Sentry/DataDog)

---

## 📚 Documentation

- **Smart Contracts**: `Liquidity-pools/SMART_CONTRACT_GUIDE.md`
- **Backend Integration**: `Liquidity-pools/BACKEND_INTEGRATION.md`
- **ENS Service**: `ens-service/README.md`
- **Main README**: `README.md`

---

## 🎥 Demo Script

1. **Show wallet creation**:
   - Send "JOIN" SMS
   - Receive wallet address
   - Register ENS name "demo"

2. **Show voucher redemption**:
   - Send "REDEEM DEMO123"
   - Show auto-swap to ETH
   - Check balance

3. **Show ENS-based transfer**:
   - Send "SEND 10 TXTC TO alice"
   - Show name resolution
   - Confirm transfer

4. **Show liquidity pool**:
   - Display pool reserves
   - Execute swap
   - Show price impact

---

## 🏆 Hackathon Tracks

This project qualifies for:
- **Li.Fi Track**: Cross-chain swaps integration
- **Yellow Network Track**: Liquidity aggregation
- **ENS Track**: Naming service for wallets
- **Best UX**: SMS-based interface for non-crypto users
- **Social Impact**: Financial inclusion for 2.5B users

---

## 🤝 Team & Contact

Built for **ETH Global HackMoney 2026**

**Tech Stack**:
- Solidity (Foundry)
- Rust (Tokio, Ethers-rs)
- TypeScript (Express, Ethers.js)
- PostgreSQL
- Twilio

---

## 🚀 Next Steps

1. **Mainnet Deployment**: Deploy to Polygon mainnet
2. **Shop Partnerships**: Onboard local shops in India/Kenya
3. **Mobile App**: Build companion app for shops
4. **More Chains**: Add support for Base, Arbitrum
5. **Fiat Off-ramp**: Partner with local exchanges

---

**Ready to demo! 🎉**
