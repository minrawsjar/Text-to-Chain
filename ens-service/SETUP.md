# ENS Service Setup Instructions

## ✅ Compilation Complete

The ENS contract has been compiled and the ABI is ready at `src/abis/ENSRegistry.json`.

## 🔧 Configuration Required

You need to configure the `.env` file with actual values before starting the service.

### Step 1: Edit .env file

```bash
nano .env
```

Or open in your editor and update these values:

```bash
# Blockchain Configuration
PRIVATE_KEY=0x1234567890abcdef...  # Your actual private key (with 0x prefix)
RPC_URL=https://polygon-mumbai.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
CHAIN_ID=80001

# Contract Address (deploy first, then add here)
ENS_REGISTRY_ADDRESS=0x...  # Will be set after deployment

# Service Configuration
ENS_SERVICE_PORT=3002
```

### Step 2: Deploy ENS Contract (Optional - for testing)

If you want to deploy the ENS contract separately:

```bash
cd contracts

# Set your environment variables
export PRIVATE_KEY="your_private_key"
export RPC_URL="your_rpc_url"

# Deploy using forge
forge create ENSRegistry \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY

# Copy the deployed address to .env as ENS_REGISTRY_ADDRESS
```

### Step 3: Start the Service

```bash
npm run dev
```

The service will start on `http://localhost:3002`

## 🧪 Test the Service

Once running, test with:

```bash
# Health check
curl http://localhost:3002/health

# Check name availability
curl http://localhost:3002/check/alice

# Get registration fee
curl http://localhost:3002/fee
```

## 📝 Integration with SMS Backend

Add to your SMS backend `.env`:

```bash
ENS_SERVICE_URL=http://localhost:3002
```

Then use the REST API endpoints as shown in the README.md

## 🚨 Important Notes

1. **Never commit `.env` file** - It's already in `.gitignore`
2. **Use testnet first** - Test on Polygon Mumbai before mainnet
3. **Fund your wallet** - Ensure the private key has testnet MATIC
4. **Deploy ENS contract** - Or use the one from Liquidity-pools deployment

## 🔗 Quick Links

- **ENS Contract**: `contracts/ENSRegistry.sol`
- **API Documentation**: `README.md`
- **Integration Guide**: `../Liquidity-pools/BACKEND_INTEGRATION.md`
