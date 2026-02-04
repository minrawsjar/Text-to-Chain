# Backend Integration Guide

## Overview

This directory contains the integration layer between the Text-to-Chain backend services and the deployed smart contracts on Sepolia testnet.

## Deployed Contracts (Sepolia)

```
TokenXYZ:              0x4d054FB258A260982F0bFab9560340d33D9E698B
VoucherManager:        0x3094e5820F911f9119D201B9E2DdD4b9cf792990
UniswapV3PoolManager:  0xd9794c0daC0382c11F6Cf4a8365a8A49690Dcfc8
EntryPointV3:          0x6b5b8b917f3161aeb72105b988E55910e231d240
Uniswap V3 Pool:       0x54fB26024019504e075B98c2834adEB29E779c7e
```

## Setup

### TypeScript/Node.js Integration

1. **Install dependencies:**
```bash
cd backend-integration
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your RPC URL and private key
```

3. **Use the contract service:**
```typescript
import { getContractService } from './contract-service';

const service = getContractService(process.env.PRIVATE_KEY);

// Redeem voucher
const result = await service.redeemVoucher(
  'VOUCHER123',
  '0xUserAddress',
  true // auto-swap to ETH
);

// Get balance
const balance = await service.getTokenBalance('0xUserAddress');
```

### Rust Integration

For the SMS request handler (Rust), use the provided contract integration:

```rust
use ethers::prelude::*;

// See rust-integration.rs for full implementation
```

## SMS Command Mapping

| SMS Command | Contract Function | Description |
|-------------|------------------|-------------|
| `REDEEM <code>` | `entryPoint.redeemVoucher()` | Redeem voucher, auto-swap to ETH |
| `SWAP <amount> TXTC` | `entryPoint.swapTokenForEth()` | Swap tokens for ETH |
| `BALANCE` | `tokenXYZ.balanceOf()` | Check token balance |
| `SEND <amount> <phone>` | `tokenXYZ.transfer()` | Send tokens to another user |

## Contract Functions

### EntryPointV3

**Main entry point for all backend operations**

```typescript
// Redeem voucher with auto-swap
redeemVoucher(code: string, user: address, swapToEth: bool)
  → (tokenAmount: uint256, ethAmount: uint256)

// Swap tokens for ETH
swapTokenForEth(user: address, tokenAmount: uint256, minEthOut: uint256)
  → (ethOut: uint256)

// Swap ETH for tokens
swapEthForToken(user: address, minTokenOut: uint256) payable
  → (tokenOut: uint256)

// Get swap quote
getSwapQuote(amount: uint256, isTokenToEth: bool) view
  → (uint256)

// Get pool info
getCurrentPrice() view → (uint160)
getPoolLiquidity() view → (uint128)
getPool() view → (address)
```

### TokenXYZ

**ERC20 token with minting controls**

```typescript
balanceOf(address) view → (uint256)
transfer(to: address, amount: uint256) → (bool)
approve(spender: address, amount: uint256) → (bool)
```

### VoucherManager

**Manages voucher creation and redemption**

```typescript
// Called via EntryPoint
redeemVoucher(code: string, user: address) → (uint256)
```

## Integration Examples

### 1. User Redeems Voucher (SMS: REDEEM ABC123)

```typescript
async function handleRedeemCommand(voucherCode: string, userPhone: string) {
  // 1. Get user wallet from database
  const user = await db.getUserByPhone(userPhone);
  
  // 2. Call contract
  const result = await contractService.redeemVoucher(
    voucherCode,
    user.walletAddress,
    true // auto-swap to ETH
  );
  
  // 3. Update database
  await db.updateBalance(user.id, {
    txtcBalance: result.tokenAmount,
    ethBalance: result.ethAmount,
  });
  
  // 4. Send SMS response
  await sms.send(userPhone, 
    `✓ Voucher redeemed! Received ${result.ethAmount} ETH`
  );
}
```

### 2. User Checks Balance (SMS: BALANCE)

```typescript
async function handleBalanceCommand(userPhone: string) {
  const user = await db.getUserByPhone(userPhone);
  
  const txtcBalance = await contractService.getTokenBalance(user.walletAddress);
  const ethBalance = await contractService.getEthBalance(user.walletAddress);
  
  await sms.send(userPhone,
    `Balance:\nTXTC: ${txtcBalance}\nETH: ${ethBalance}`
  );
}
```

### 3. User Swaps Tokens (SMS: SWAP 100 TXTC)

```typescript
async function handleSwapCommand(amount: string, userPhone: string) {
  const user = await db.getUserByPhone(userPhone);
  
  const result = await contractService.swapTokenForEth(
    user.walletAddress,
    amount,
    '0' // min ETH out (adjust for slippage)
  );
  
  await sms.send(userPhone,
    `✓ Swapped ${amount} TXTC for ${result.ethReceived} ETH`
  );
}
```

## Gas Management

The backend wallet needs ETH for gas. Recommended setup:

1. **Fund backend wallet** with ~0.5 ETH on Sepolia
2. **Monitor gas usage** via Etherscan
3. **Set gas limits** appropriately:
   - Redeem voucher: ~200,000 gas
   - Swap: ~150,000 gas
   - Transfer: ~50,000 gas

## Error Handling

```typescript
try {
  const result = await contractService.redeemVoucher(...);
} catch (error) {
  if (error.message.includes('VoucherManager: invalid code')) {
    await sms.send(phone, '❌ Invalid voucher code');
  } else if (error.message.includes('insufficient funds')) {
    await sms.send(phone, '❌ Insufficient balance');
  } else {
    await sms.send(phone, '❌ Transaction failed. Try again.');
    logger.error('Contract error:', error);
  }
}
```

## Testing

### Test on Sepolia

```bash
# Set test environment
export RPC_URL="https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY"
export PRIVATE_KEY="your_test_wallet_key"

# Run integration tests
npm test
```

### Test Commands

```typescript
// Test redeem
const result = await service.redeemVoucher(
  'TEST123',
  '0xTestAddress',
  true
);

// Test balance
const balance = await service.getTokenBalance('0xTestAddress');

// Test swap
const swap = await service.swapTokenForEth(
  '0xTestAddress',
  '100',
  '0'
);
```

## Monitoring

### Check Contract Status

```bash
# Pool liquidity
cast call 0xd9794c0daC0382c11F6Cf4a8365a8A49690Dcfc8 \
  "getPoolLiquidity()(uint128)" \
  --rpc-url $RPC_URL

# Current price
cast call 0xd9794c0daC0382c11F6Cf4a8365a8A49690Dcfc8 \
  "getCurrentPrice()(uint160)" \
  --rpc-url $RPC_URL

# Token balance
cast call 0x4d054FB258A260982F0bFab9560340d33D9E698B \
  "balanceOf(address)(uint256)" \
  0xUserAddress \
  --rpc-url $RPC_URL
```

### Etherscan Links

- EntryPoint: https://sepolia.etherscan.io/address/0x6b5b8b917f3161aeb72105b988E55910e231d240
- Pool: https://sepolia.etherscan.io/address/0x54fB26024019504e075B98c2834adEB29E779c7e

## Next Steps

1. ✅ Contracts deployed and verified
2. ✅ Integration files created
3. ⏳ Update SMS handler with contract calls
4. ⏳ Test end-to-end flow
5. ⏳ Deploy to production

## Support

For issues or questions:
- Check transaction on Etherscan
- Review contract ABIs in this directory
- Test with small amounts first
