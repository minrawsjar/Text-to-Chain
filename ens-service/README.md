# ENS Service for Text-to-Chain

## Overview

Standalone ENS (Ethereum Name Service) integration for Text-to-Chain wallet naming. This service provides human-readable names for wallet addresses via SMS.

## Features

- **Name Registration**: Register `.textchain.eth` names
- **Name Resolution**: Resolve names to addresses and vice versa
- **Availability Check**: Check if names are available
- **Name Suggestions**: Get alternative suggestions for taken names
- **SMS Integration**: Prompt users during wallet creation

## Architecture

```
SMS Backend → ENS Service → ENSRegistry.sol
     ↓              ↓              ↓
  User Phone    REST API      Blockchain
```

## Setup

### 1. Install Dependencies

```bash
cd ens-service
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Deploy ENS Contract

```bash
cd contracts
forge build
forge script scripts/DeployENS.s.sol --rpc-url $RPC_URL --broadcast
```

### 4. Start Service

```bash
npm run dev
```

## API Endpoints

### Register Name
```bash
POST /register
{
  "name": "alice",
  "ownerAddress": "0x..."
}

Response:
{
  "success": true,
  "name": "alice.textchain.eth",
  "txHash": "0x..."
}
```

### Check Availability
```bash
GET /check/alice

Response:
{
  "name": "alice.textchain.eth",
  "available": false
}
```

### Resolve Name
```bash
GET /resolve/alice

Response:
{
  "name": "alice.textchain.eth",
  "address": "0x..."
}
```

### Reverse Resolve
```bash
GET /reverse/0x...

Response:
{
  "address": "0x...",
  "name": "alice.textchain.eth"
}
```

### Get Suggestions
```bash
GET /suggestions/alice

Response:
{
  "baseName": "alice",
  "suggestions": [
    "alice1.textchain.eth",
    "alice2.textchain.eth",
    "alice123.textchain.eth"
  ]
}
```

## SMS Integration Flow

### Wallet Creation with ENS Prompt

```
User: "JOIN"
Backend: Creates wallet → 0x742d...
Backend: "Welcome! Wallet created: 0x742d...
         Would you like a name for easy payments?
         Reply with: NAME <yourname>
         Example: NAME alice"

User: "NAME alice"
Backend: Checks availability via ENS service
Backend: "✓ Registered alice.textchain.eth!
         You can now receive payments via 'alice'"

User: "NAME bob"
Backend: "✗ Name 'bob' is taken. Try:
         - bob1.textchain.eth
         - bob2.textchain.eth
         - bob456.textchain.eth"
```

### Sending to ENS Names

```
User: "SEND 10 TXTC TO alice"
Backend: Resolves 'alice' → 0x742d...
Backend: Sends tokens
Backend: "✓ Sent 10 TXTC to alice.textchain.eth"
```

## Integration with SMS Backend (Rust)

### Update Wallet Creation Handler

```rust
// In sms-request-handler/src/commands/join.rs

use reqwest;
use serde_json::json;

pub async fn handle_join(phone: &str) -> Result<String, Box<dyn std::error::Error>> {
    // Create wallet
    let wallet = create_wallet(phone).await?;
    
    // Store in database
    save_user(phone, &wallet.address, &wallet.encrypted_key).await?;
    
    // Prompt for ENS name
    let message = format!(
        "Welcome to TextChain! 🎉\n\
         Wallet: {}\n\n\
         💡 Get a name for easy payments!\n\
         Reply: NAME <yourname>\n\
         Example: NAME alice",
        wallet.address
    );
    
    send_sms(phone, &message).await?;
    
    Ok(message)
}
```

### Update Name Registration Handler

```rust
// In sms-request-handler/src/commands/name.rs

pub async fn handle_name_registration(
    phone: &str,
    name: &str
) -> Result<String, Box<dyn std::error::Error>> {
    
    let user = get_user_by_phone(phone).await?;
    
    // Call ENS service
    let client = reqwest::Client::new();
    let ens_service_url = std::env::var("ENS_SERVICE_URL")?;
    
    let response = client
        .post(&format!("{}/register", ens_service_url))
        .json(&json!({
            "name": name.to_lowercase(),
            "ownerAddress": user.wallet_address
        }))
        .send()
        .await?;
    
    if response.status().is_success() {
        let result: serde_json::Value = response.json().await?;
        let full_name = result["name"].as_str().unwrap_or(name);
        
        // Update database
        update_user_ens_name(phone, name).await?;
        
        Ok(format!(
            "✓ Registered {}!\n\
             You can now receive payments via '{}'",
            full_name, name
        ))
    } else {
        let error: serde_json::Value = response.json().await?;
        
        if let Some(suggestions) = error["suggestions"].as_array() {
            let suggestion_list: Vec<String> = suggestions
                .iter()
                .take(3)
                .filter_map(|s| s.as_str())
                .map(|s| format!("  • {}", s))
                .collect();
            
            Ok(format!(
                "✗ Name '{}' is taken.\n\
                 Try these:\n{}",
                name,
                suggestion_list.join("\n")
            ))
        } else {
            Ok(format!("✗ {}", error["error"].as_str().unwrap_or("Registration failed")))
        }
    }
}
```

### Update Send Handler to Support ENS

```rust
// In sms-request-handler/src/commands/send.rs

pub async fn resolve_recipient(recipient: &str) -> Result<String, Box<dyn std::error::Error>> {
    // Check if it's a phone number
    if recipient.starts_with('+') {
        let user = get_user_by_phone(recipient).await?;
        return Ok(user.wallet_address);
    }
    
    // Check if it's an address
    if recipient.starts_with("0x") && recipient.len() == 42 {
        return Ok(recipient.to_string());
    }
    
    // Assume it's an ENS name
    let client = reqwest::Client::new();
    let ens_service_url = std::env::var("ENS_SERVICE_URL")?;
    
    let response = client
        .get(&format!("{}/resolve/{}", ens_service_url, recipient))
        .send()
        .await?;
    
    if response.status().is_success() {
        let result: serde_json::Value = response.json().await?;
        Ok(result["address"].as_str().unwrap().to_string())
    } else {
        Err(format!("Name '{}' not found", recipient).into())
    }
}
```

## Database Schema Update

Add ENS name tracking to users table:

```sql
ALTER TABLE users ADD COLUMN ens_name VARCHAR(32);
ALTER TABLE users ADD COLUMN ens_registered_at TIMESTAMP;
CREATE INDEX idx_users_ens_name ON users(ens_name);
```

## Environment Variables

Add to your SMS backend `.env`:

```bash
# ENS Service
ENS_SERVICE_URL=http://localhost:3002
```

## Testing

```bash
# Start ENS service
npm run dev

# Test registration
curl -X POST http://localhost:3002/register \
  -H "Content-Type: application/json" \
  -d '{"name":"alice","ownerAddress":"0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0"}'

# Test resolution
curl http://localhost:3002/resolve/alice

# Test availability
curl http://localhost:3002/check/bob
```

## Production Deployment

1. Build TypeScript:
```bash
npm run build
```

2. Start with PM2:
```bash
pm2 start dist/index.js --name ens-service
```

3. Set up reverse proxy (nginx):
```nginx
location /ens/ {
    proxy_pass http://localhost:3002/;
}
```

## Benefits of Separate ENS Service

1. **Modularity**: Independent deployment and scaling
2. **Reusability**: Can be used by multiple services
3. **Maintainability**: Focused codebase for naming logic
4. **Performance**: Dedicated service for name resolution
5. **Testing**: Easier to test in isolation

## User Experience Flow

```
┌─────────────────────────────────────────────────────────┐
│ User sends: "JOIN"                                      │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ Backend creates wallet                                  │
│ Stores in database                                      │
│ Sends prompt: "Would you like a name?"                  │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ User sends: "NAME alice"                                │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ Backend → ENS Service → Check availability              │
│         → Register on blockchain                        │
│         → Update database                               │
│         → Confirm to user                               │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ User can now receive via:                               │
│ • Phone: +1234567890                                    │
│ • Name: alice                                           │
│ • Address: 0x742d...                                    │
└─────────────────────────────────────────────────────────┘
```

---

**Built for ETH Global HackMoney 2026**
