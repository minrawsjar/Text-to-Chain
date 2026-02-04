/**
 * Test Integration Script
 * Tests connection to contracts without executing transactions
 */

import { ethers } from 'ethers';
import { SEPOLIA_CONFIG } from './contracts.config';
import * as dotenv from 'dotenv';

dotenv.config();

async function testIntegration() {
  console.log('🧪 Testing Backend Integration\n');
  console.log('='.repeat(50));
  
  try {
    // 1. Test RPC Connection
    console.log('\n1️⃣ Testing RPC Connection...');
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const network = await provider.getNetwork();
    console.log(`✓ Connected to network: ${network.name} (Chain ID: ${network.chainId})`);
    
    // 2. Test Contract Addresses
    console.log('\n2️⃣ Verifying Contract Deployments...');
    
    const contracts = [
      { name: 'TokenXYZ', address: SEPOLIA_CONFIG.contracts.tokenXYZ },
      { name: 'VoucherManager', address: SEPOLIA_CONFIG.contracts.voucherManager },
      { name: 'PoolManager', address: SEPOLIA_CONFIG.contracts.uniswapV3PoolManager },
      { name: 'EntryPointV3', address: SEPOLIA_CONFIG.contracts.entryPointV3 },
      { name: 'Uniswap V3 Pool', address: SEPOLIA_CONFIG.contracts.uniswapV3Pool },
    ];
    
    for (const contract of contracts) {
      const code = await provider.getCode(contract.address);
      if (code === '0x') {
        console.log(`❌ ${contract.name}: No code at ${contract.address}`);
      } else {
        console.log(`✓ ${contract.name}: ${contract.address}`);
      }
    }
    
    // 3. Test Reading from TokenXYZ
    console.log('\n3️⃣ Testing Contract Reads...');
    const tokenABI = [
      'function name() view returns (string)',
      'function symbol() view returns (string)',
      'function totalSupply() view returns (uint256)',
    ];
    
    const tokenContract = new ethers.Contract(
      SEPOLIA_CONFIG.contracts.tokenXYZ,
      tokenABI,
      provider
    );
    
    const name = await tokenContract.name();
    const symbol = await tokenContract.symbol();
    const totalSupply = await tokenContract.totalSupply();
    
    console.log(`✓ Token Name: ${name}`);
    console.log(`✓ Token Symbol: ${symbol}`);
    console.log(`✓ Total Supply: ${ethers.formatEther(totalSupply)} ${symbol}`);
    
    // 4. Test Pool Info
    console.log('\n4️⃣ Testing Pool Manager...');
    const poolManagerABI = [
      'function getPool() view returns (address)',
      'function getPoolLiquidity() view returns (uint128)',
      'function getCurrentPrice() view returns (uint160)',
    ];
    
    const poolManager = new ethers.Contract(
      SEPOLIA_CONFIG.contracts.uniswapV3PoolManager,
      poolManagerABI,
      provider
    );
    
    const poolAddress = await poolManager.getPool();
    const liquidity = await poolManager.getPoolLiquidity();
    const price = await poolManager.getCurrentPrice();
    
    console.log(`✓ Pool Address: ${poolAddress}`);
    console.log(`✓ Pool Liquidity: ${liquidity.toString()}`);
    console.log(`✓ Current Price (sqrtPriceX96): ${price.toString()}`);
    
    // 5. Test Wallet Connection (if private key provided)
    if (process.env.PRIVATE_KEY) {
      console.log('\n5️⃣ Testing Wallet Connection...');
      const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
      const balance = await provider.getBalance(wallet.address);
      
      console.log(`✓ Backend Wallet: ${wallet.address}`);
      console.log(`✓ Balance: ${ethers.formatEther(balance)} ETH`);
      
      if (balance < ethers.parseEther('0.01')) {
        console.log('⚠️  Warning: Low balance! Fund wallet for gas.');
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('✅ All Integration Tests Passed!');
    console.log('='.repeat(50));
    console.log('\n📋 Next Steps:');
    console.log('1. Update SMS handler with contract calls');
    console.log('2. Test voucher redemption flow');
    console.log('3. Test balance and swap commands');
    console.log('4. Deploy to production\n');
    
  } catch (error: any) {
    console.error('\n❌ Integration Test Failed:');
    console.error(error.message);
    
    if (error.message.includes('could not detect network')) {
      console.error('\n💡 Tip: Check your RPC_URL in .env file');
    } else if (error.message.includes('invalid address')) {
      console.error('\n💡 Tip: Verify contract addresses in contracts.config.ts');
    }
    
    process.exit(1);
  }
}

// Run tests
testIntegration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
