# Text-to-Chain Smart Contracts

Solidity smart contracts for the Text-to-Chain SMS-based DeFi platform, built with [Foundry](https://book.getfoundry.sh/).

## Deployed Contracts (Sepolia Testnet)

| Contract | Address |
|----------|---------|
| **TokenXYZ (TXTC)** | `0x0F0E4A3F59C3B8794A9044a0dC0155fB3C3fA223` |
| **VoucherManager** | `0x74B02854a16cf33416541625C100beC97cC94F01` |
| **EntryPointV3** | `0x0084FA06Fa317D4311d865f35d62dCBcb0517355` |
| **UniswapV3PoolManager** | `0xd9794c0daC0382c11F6Cf4a8365a8A49690Dcfc8` |
| **Uniswap V3 Pool (TXTC/WETH)** | `0xfdbf742dfc37b7ed1da429d3d7add78d99026c23` |
| **ENS Subdomain Registrar** | `0xcD057A8AbF3832e65edF5d224313c6b4e6324F76` |

## Contracts

### TokenXYZ.sol
ERC20 token (TXTC) with owner-controlled minting and `burnFromAny` — enables the backend to burn tokens from any user wallet for gasless swaps.

### VoucherManager.sol
On-chain voucher creation and redemption. No shop registration required. Voucher codes are validated on-chain and tokens are minted on redemption.

### EntryPointV3.sol
Central hub for backend operations — voucher redemption with auto-swap, token swap orchestration via Uniswap V3, and backend authorization.

### UniswapV3PoolManager.sol
Manages the TXTC/WETH Uniswap V3 liquidity pool (0.3% fee tier). Handles pool creation, initialization, and swap execution.

### ENSSubdomainRegistrar.sol
Registers ENS subdomains under `ttcip.eth` (e.g., `alice.ttcip.eth`) and maps them to wallet addresses.

## Usage

```bash
# Build
forge build

# Test
forge test

# Deploy
forge script script/Deploy.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast
```

## Environment

```env
PRIVATE_KEY=0x...
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
ETHERSCAN_API_KEY=...
```
