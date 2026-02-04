#!/bin/bash

# Create a $10 Voucher for Text-to-Chain
# This script generates a voucher code and registers it on-chain

set -e

echo "🎫 Creating $10 Voucher"
echo "======================"

# Load environment from Liquidity-pools/.env
if [ -f "Liquidity-pools/.env" ]; then
    export $(cat Liquidity-pools/.env | grep -v '^#' | xargs)
else
    echo "❌ Error: Liquidity-pools/.env not found"
    exit 1
fi

# Contract address
VOUCHER_MANAGER="0x3094e5820F911f9119D201B9E2DdD4b9cf792990"

# Generate unique voucher code
TIMESTAMP=$(date +%s)
VOUCHER_CODE="SHOP${TIMESTAMP}"

echo ""
echo "Voucher Code: $VOUCHER_CODE"
echo ""

# Calculate code hash
CODE_HASH=$(cast keccak $(cast --from-utf8 "$VOUCHER_CODE"))
echo "Code Hash: $CODE_HASH"

# $10 = 1000 TXTC (assuming 1 TXTC = $0.01)
# In wei: 1000 * 10^18
TOKEN_AMOUNT="1000000000000000000000"

echo "Token Amount: 1000 TXTC"
echo ""

# Get deployer address from private key
DEPLOYER=$(cast wallet address --private-key $PRIVATE_KEY)
echo "Deployer address: $DEPLOYER"
echo ""

# Check if shop is registered
echo "Checking shop registration..."
SHOP_INFO=$(cast call $VOUCHER_MANAGER \
  "shops(address)(address,string,string,uint256,uint256,uint256,uint256,uint256,bool,uint256)" \
  $DEPLOYER \
  --rpc-url $RPC_URL 2>/dev/null || echo "not_registered")

if [[ "$SHOP_INFO" == "not_registered" ]] || [[ "$SHOP_INFO" == *"0x0000000000000000000000000000000000000000"* ]]; then
    echo "⚠️  Shop not registered. Registering now..."
    echo ""
    
    cast send $VOUCHER_MANAGER \
      "registerShop(string,string)" \
      "TextChain Shop" \
      "Online" \
      --value 1ether \
      --private-key $PRIVATE_KEY \
      --rpc-url $RPC_URL \
      --gas-limit 300000
    
    echo ""
    echo "✅ Shop registered with 1 ETH stake"
    echo ""
fi

# Create voucher
echo "Creating voucher on-chain..."
echo ""

TX_HASH=$(cast send $VOUCHER_MANAGER \
  "generateVoucher(bytes32,uint256)" \
  $CODE_HASH \
  $TOKEN_AMOUNT \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC_URL \
  --gas-limit 200000 \
  --json | jq -r '.transactionHash')

echo "Transaction: $TX_HASH"
echo ""

# Wait for confirmation
echo "Waiting for confirmation..."
sleep 5

# Verify voucher
echo ""
echo "Verifying voucher..."
VOUCHER_INFO=$(cast call $VOUCHER_MANAGER \
  "vouchers(bytes32)" \
  $CODE_HASH \
  --rpc-url $RPC_URL)

echo "Voucher Info: $VOUCHER_INFO"
echo ""

# Save voucher to file
VOUCHER_FILE="vouchers.txt"
echo "$VOUCHER_CODE | 1000 TXTC | \$10 | $(date) | $TX_HASH" >> $VOUCHER_FILE

echo "======================================"
echo "✅ Voucher Created Successfully!"
echo "======================================"
echo ""
echo "📋 Voucher Details:"
echo "   Code:  $VOUCHER_CODE"
echo "   Value: 1000 TXTC (~\$10)"
echo "   TX:    $TX_HASH"
echo ""
echo "📝 Saved to: $VOUCHER_FILE"
echo ""
echo "🎁 Give this code to customer:"
echo ""
echo "   ┌─────────────────────────┐"
echo "   │  $VOUCHER_CODE  │"
echo "   │  Value: \$10            │"
echo "   └─────────────────────────┘"
echo ""
echo "📱 Customer can redeem by SMS:"
echo "   REDEEM $VOUCHER_CODE"
echo ""
echo "🔗 View on Etherscan:"
echo "   https://sepolia.etherscan.io/tx/$TX_HASH"
echo ""
