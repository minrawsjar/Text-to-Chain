# Text-to-Chain: SMS-Based DeFi Platform

> **Bringing Web3 to everyone through simple text messages**

An SMS-based DeFi platform enabling users to interact with blockchain technology using only text messages. No smartphone, no app, no MetaMask required.

**Target Users:** 2.5 billion feature phone users worldwide who lack access to traditional banking and smartphone-based crypto wallets.

→ **[Vision & Mission](docs/vision-and-mission.md)** — what Text-to-Chain is about and why we build it.  
→ **[Technical Overview](docs/technical-overview.md)** — deep dive: onboarding, features, architecture, trust model (TEE / secure server).

---

## 💬 SMS Commands

| Command | Description | Example |
|---------|-------------|---------|
| `JOIN` | Create wallet + ENS subdomain | `JOIN alice` |
| `BALANCE` | Check TXTC and ETH balances | `BALANCE` |
| `DEPOSIT` | Get wallet address | `DEPOSIT` |
| `REDEEM <code>` | Redeem voucher for tokens | `REDEEM ABC123` |
| `SEND <amt> <token> TO <recipient>` | Send tokens (batched via Yellow Network) | `SEND 10 TXTC TO alice.ttcip.eth` |
| `SWAP <amt> TXTC` | Swap TXTC for ETH (Uniswap V3) | `SWAP 5 TXTC` |
| `CASHOUT <amt> TXTC` | Convert TXTC → USDC on Arc via CCTP | `CASHOUT 10 TXTC` |
| `BRIDGE <amt> <token> FROM <chain> TO <chain>` | Cross-chain bridge (Li.Fi, mainnet) | `BRIDGE 10 USDC FROM POLYGON TO BASE` |
| `SAVE <name> <phone>` | Save a contact | `SAVE alice +919876543210` |
| `CONTACTS` | List saved contacts | `CONTACTS` |
| `CHAIN <name>` | Switch active chain | `CHAIN polygon` |
| `PIN <xxxx>` | Set/change PIN | `PIN 1234` |
| `HELP` | Show commands | `HELP` |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         USER LAYER                               │
│  Feature Phone ──► SMS ──► Twilio ──► Cloudflare Tunnel          │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                  SMS REQUEST HANDLER (Rust, Port 8080)           │
│  • Command Parser (JOIN, BALANCE, SEND, SWAP, CASHOUT, etc.)    │
│  • User Auth (phone → wallet mapping in SQLite)                  │
│  • Routes to backend microservices                               │
└──────────────────────────────────────────────────────────────────┘
       │              │              │              │
       ▼              ▼              ▼              ▼
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌─────────────────┐
│ Backend    │ │ Yellow     │ │ Arc/CCTP   │ │ Li.Fi Bridge    │
│ API :3000  │ │ Batch :8083│ │ Service    │ │ (via Backend)   │
│            │ │            │ │ :8084      │ │                 │
│ • Redeem   │ │ • Batch    │ │ • CASHOUT  │ │ • Cross-chain   │
│ • Balance  │ │   SEND     │ │ • Circle   │ │ • Multi-chain   │
│ • Swap     │ │ • Nitrolite│ │   Wallets  │ │ • Quote/Execute │
│ • ENS      │ │ • Off-chain│ │ • CCTP     │ │                 │
│ • Notify   │ │ • Settle   │ │   Bridge   │ │                 │
└─────┬──────┘ └─────┬──────┘ └──┬───┬─────┘ └─────────────────┘
      │              │           │   │
      ▼              ▼           │   │
┌─────────────────────────────┐  │   │
│  SEPOLIA TESTNET            │  │   │
│                             │  │   │
│  TXTC Token    0x0F0E...223 │  │   │
│  VoucherMgr    0x74B0...F01 │  │   │
│  Uniswap V3   0xfdbf...c23 │  │   │
│  WETH          0xfFf9...B14 │  │   │
│  USDC          0x1c7d...238 │  │   │
│  ENS Registrar 0xcD05...F76 │  │   │
│  TokenMessengerV2 (CCTP)    │◄─┘   │
└─────────────────────────────┘      │
              │ CCTP depositForBurn   │
              ▼                       │
┌─────────────────────────────┐      │
│  CIRCLE ATTESTATION SERVICE │      │
│  (Iris API Sandbox)         │      │
│  • Fast Transfer (~20s)     │      │
│  • Attestation signing      │      │
└─────────────┬───────────────┘      │
              │ attestation           │
              ▼                       │
┌─────────────────────────────┐      │
│  ARC TESTNET                │◄─────┘
│                             │  receiveMessage (mint)
│  USDC (native)   0x3600..  │
│  MessageTransmitterV2      │
│  Circle Wallets (per user) │
│  Batch Payouts             │
└─────────────────────────────┘
```

### CASHOUT Flow (TXTC → USDC on Arc)

```
User SMS: "CASHOUT 10 TXTC"
    │
    ▼
1. Burn 10 TXTC from user's Sepolia wallet
    │
    ▼
2. Swap TXTC → WETH (Uniswap V3, 0.3% pool)
    │
    ▼
3. Swap WETH → USDC (Uniswap V3, 0.05% pool)
    │
    ▼
4. Approve USDC → TokenMessengerV2
    │
    ▼
5. depositForBurn (CCTP) → Sepolia → Arc (domain 0 → 26)
    │
    ▼
6. Poll Circle Iris API for attestation (~20s Fast Transfer)
    │
    ▼
7. receiveMessage on Arc → USDC minted to user's Circle Wallet
    │
    ▼
8. SMS notification: "✅ Cashout complete! 10 TXTC → ~$240 USDC"
```

---

## ✅ Implemented Features

### 1. SMS Command Interface
- **Rust-based** SMS webhook handler (Axum framework)
- Command parser with pattern matching for all commands above
- Twilio + SMSCountry integration for SMS delivery
- SQLite database for users, vouchers, contacts, deposits

### 2. Wallet Management
- Automatic wallet creation on `JOIN`
- ENS subdomain registration (`alice.ttcip.eth`)
- On-chain ENS registrar at `0xcD057A8AbF3832e65edF5d224313c6b4e6324F76`
- Phone-to-wallet mapping in SQLite

### 3. Token Transfers via Yellow Network
- **Off-chain batching** using Nitrolite SDK state channels
- Transactions queued and processed every **3 minutes**
- Flow: Queue → Open Yellow session → Off-chain transfers → On-chain TXTC mint → Close session
- WebSocket connection to `wss://clearnet-sandbox.yellow.com/ws`
- Custody address: `0x019B65A265EB3363822f2752141b3dF16131b262`
- Asset: `ytest.usd` (Yellow sandbox token)
- On-chain settlement mints TXTC to recipients on Sepolia
- SMS notifications on completion

### 4. Token Swaps (Uniswap V3)
- `SWAP <amount> TXTC` → swaps TXTC for ETH
- Backend burns user's TXTC, mints to itself, swaps via Uniswap V3
- Pool: TXTC/WETH at 0.3% fee tier
- SwapRouter: `0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E`
- Async execution with SMS notification on completion

### 5. Cross-Chain Bridge (Li.Fi) — Mainnet Ready
- `BRIDGE 10 USDC FROM POLYGON TO BASE`
- Li.Fi aggregates 20+ bridges (Stargate, Across, Hop, etc.)
- **Supported chains:** Ethereum, Polygon, Arbitrum, Optimism, Base, Avalanche, BSC
- **Supported tokens:** USDC, USDT, ETH, MATIC
- Quote endpoint returns estimated output, min output, execution time
- Async execution with SMS notification
- **Note:** Li.Fi is mainnet-only — does not work with testnet tokens

### 6. Voucher System
- On-chain voucher creation via VoucherManager
- `REDEEM <code>` mints TXTC + ETH gas bonus
- No shop registration required

### 7. Deposit Detection
- Blockchain polling service monitors user wallets
- Detects incoming ETH and ERC20 transfers
- SMS notification on deposit

### 8. Contact Book
- `SAVE alice +919876543210` — save contacts
- `CONTACTS` — list saved contacts
- Send to contacts by name

### 9. Airtime-to-Token Conversion
- Buy TXTC tokens with mobile airtime (MTN, Airtel)
- USSD menu interface (`*384*46750#`)
- 90% TXTC + 10% ETH distribution
- Africa's Talking payment gateway integration

### 10. CASHOUT — USDC on Arc via Circle CCTP (Bounty Track)
- `CASHOUT <amount> TXTC` → converts TXTC to USDC on Arc Testnet
- **Full on-chain flow:** Burn TXTC from user → Swap TXTC→WETH → Swap WETH→USDC (Uniswap V3) → CCTP bridge to Arc
- **Circle CCTP V2** with Fast Transfer (~20 second attestation)
- **Circle Developer-Controlled Wallets** — one per user, mapped by phone number
- **Persistent wallet storage** — survives container restarts (file-backed + Docker volume)
- **Multi-recipient batch payouts** — `POST /api/arc/batch-payout` sends USDC to multiple Arc wallets
- **Treasury dashboard API** — `GET /api/arc/treasury` returns aggregate balances and payout stats
- **SMS notification** on cashout completion via Twilio
- **Contract addresses:**
  - Sepolia TokenMessengerV2: `0x8fe6b999dc680ccfdd5bf7eb0974218be2542daa`
  - Arc MessageTransmitterV2: `0xe737e5cebeeba77efe34d4aa090756590b1ce275`
  - Sepolia USDC: `0x1c7d4b196cb0c7b01d743fbc6116a902379c7238`
  - Arc USDC (native): `0x3600000000000000000000000000000000000000`
- **Circle tools used:** Arc, USDC, Circle Wallets, CCTP

---

## 📂 Repository Structure

```
Text-to-Chain/
├── sms-request-handler/     # Rust SMS webhook + command parser (Port 8080)
│   ├── src/commands/        # Command parsing (parser.rs)
│   ├── src/sms/             # Twilio/SMSCountry webhooks
│   ├── src/db/              # SQLite (users, vouchers, contacts, deposits)
│   └── src/wallet/          # Wallet creation, chains, tokens
│
├── arc-service/             # Arc/Circle CCTP Cashout Service (Port 8084)
│   ├── src/index.ts         # Express API (cashout, wallet, pay, batch-payout, treasury)
│   ├── src/cashout-service.ts # TXTC→WETH→USDC swap + CCTP bridge logic
│   ├── src/circle-wallet.ts # Circle Developer-Controlled Wallets SDK
│   ├── wallets.json         # Persistent phone→wallet mapping
│   └── Dockerfile
│
├── backend-integration/     # TypeScript API server (Port 3000)
│   ├── api-server.ts        # Express endpoints (swap, redeem, balance, bridge, ENS, notify)
│   ├── contract-service.ts  # Smart contract interactions
│   ├── lifi-service.ts      # Li.Fi bridge/swap service + chain/token maps
│   ├── ens-service.ts       # ENS subdomain registration
│   ├── blockchain-monitor.ts# Deposit detection
│   └── contracts.config.ts  # Contract addresses
│
├── yellow/                  # Yellow Network batch service (Port 8083)
│   └── src/
│       ├── batch-service.ts # Nitrolite SDK, 3-min batch loop, on-chain settlement
│       └── api-server.ts    # Queue/status/pending endpoints
│
├── lifi/                    # Li.Fi SDK example + config
│   └── src/
│       ├── config/          # Chain IDs, token addresses, SDK init
│       ├── services/        # Li.Fi API helpers (quote, allowance, status)
│       └── routes/          # Bridge/swap route handlers
│
├── ens_service/             # ENS integration (Partner Prize)
│   └── src/
│       ├── ens.rs           # Namehash, EnsMinter, ENS Registry bindings
│       ├── register.rs      # Parent domain registration (commit-reveal)
│       ├── sms.rs           # SMS conversation handler for ENS naming
│       └── main.rs          # Interactive CLI for ENS operations
│
├── Liquidity-pools/         # Solidity smart contracts (Foundry)
│   └── src/
│       ├── TokenXYZ.sol     # ERC20 with burnFromAny
│       ├── VoucherManager.sol
│       ├── EntryPointV3.sol
│       └── UniswapV3PoolManager.sol
│
├── airtime-service/         # Airtime-to-token conversion (Port 8082)
│
└── front/                   # Frontend (if applicable)
```

---

## 🔧 Technical Stack

| Layer | Technology |
|-------|-----------|
| **SMS Handler** | Rust, Axum, SQLite, reqwest |
| **Backend API** | TypeScript, Express, ethers.js v6 |
| **Arc/CCTP Service** | TypeScript, Circle SDK, CCTP V2, Circle Wallets |
| **Yellow Network** | Nitrolite SDK, WebSocket, state channels |
| **Cross-Chain** | Li.Fi SDK/API, Circle CCTP |
| **Smart Contracts** | Solidity ^0.8.20, Foundry |
| **Blockchains** | Ethereum Sepolia + Arc Testnet |
| **Circle Tools** | Arc, USDC, CCTP V2, Developer-Controlled Wallets |
| **SMS Gateway** | Twilio |
| **Infrastructure** | Docker Compose, Cloudflare Tunnel |
| **RPC Providers** | Alchemy (Sepolia), dRPC (Arc) |

---

## 🚀 Setup & Running

### Prerequisites

- Docker & Docker Compose
- Rust (latest stable) — for local SMS handler dev
- Node.js v18+ — for local backend dev

### Environment Variables

**`backend-integration/.env`:**
```env
PRIVATE_KEY=0x...              # Backend wallet (Sepolia)
ENS_PRIVATE_KEY=0x...
ALCHEMY_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...
```

**`arc-service/.env`:**
```env
PRIVATE_KEY=0x...              # Same backend wallet
ALCHEMY_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
CIRCLE_API_KEY=...             # Circle Developer Console
CIRCLE_ENTITY_SECRET=...       # Circle entity secret
```

**`yellow/.env`:**
```env
PRIVATE_KEY=0x...
ALCHEMY_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
PORT=8083
```

### Start All Services (Docker Compose)

```bash
# Start everything
docker compose up -d

# Services started:
#   sms-handler  :8080  — Rust SMS webhook
#   backend      :3000  — Contract API
#   yellow       :8083  — Yellow Network batch
#   arc          :8084  — Arc/CCTP cashout
#   tunnel-sms          — Cloudflare tunnel for Twilio
```

### Test Commands

```bash
# Test CASHOUT (TXTC → USDC on Arc)
curl -X POST http://localhost:8084/api/arc/cashout \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919876543210","userAddress":"0x...","txtcAmount":"10"}'

# Check Arc treasury
curl http://localhost:8084/api/arc/treasury

# Batch payout (multi-recipient USDC on Arc)
curl -X POST http://localhost:8084/api/arc/batch-payout \
  -H "Content-Type: application/json" \
  -d '{"fromPhone":"+919876543210","recipients":[{"phone":"+919999999999","amount":"5"},{"phone":"+918888888888","amount":"10"}]}'

# Test SMS webhook
curl -X POST http://localhost:8080/sms/incoming \
  -d 'From=%2B919876543210&Body=HELP&To=%2B12316743830'

# Check balance
curl http://localhost:3000/api/balance/0x...
```

---

## 🔐 Security

- Backend wallet key in environment variables (never committed)
- User wallets created on-chain (no private key storage in DB)
- Owner-only smart contract functions (`burnFromAny`, `mint`)
- Phone number authentication for all commands
- PIN support for transaction protection

---

## 📚 Resources

- [Uniswap V3 Docs](https://docs.uniswap.org/)
- [ENS Docs](https://docs.ens.domains/)
- [Li.Fi Docs](https://docs.li.fi/)
- [Yellow Network Docs](https://docs.yellow.org/)
- [Nitrolite SDK](https://github.com/erc7824/nitrolite)
- [Twilio SMS API](https://www.twilio.com/docs/sms)

---

## 📄 License

MIT

---

**Built for the next billion crypto users**
