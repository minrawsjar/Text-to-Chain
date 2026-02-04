/**
 * Contract API Server
 * Provides HTTP endpoints for SMS handler to call smart contracts
 */

import * as dotenv from 'dotenv';
import 'dotenv/config';
import express from 'express';
import { SEPOLIA_CONFIG } from './contracts.config.js';
import { getContractService } from './contract-service.js';
import { lifiService } from './lifi-service.js';
import { ethers } from 'ethers';

const app = express();
app.use(express.json());

// Initialize contract service
const contractService = getContractService(process.env.PRIVATE_KEY!);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', network: 'sepolia', chainId: 11155111 });
});

// ============================================================================
// STEP 1: REDEEM Endpoint
// ============================================================================
app.post('/api/redeem', async (req, res) => {
  try {
    const { voucherCode, userAddress } = req.body;
    
    if (!voucherCode || !userAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing voucherCode or userAddress',
      });
    }
    
    console.log(`📝 Redeeming voucher ${voucherCode} for ${userAddress}`);
    
    // Redeem voucher with auto-swap enabled (10% will be swapped for gas automatically by the contract)
    const result = await contractService.redeemVoucher(
      voucherCode,
      userAddress,
      true // Enable auto-swap - contract handles the 10% gas reserve
    );
    
    console.log(`✅ Redemption successful: ${result.tokenAmount} TXTC received, ${result.ethAmount} ETH for gas`);
    
    // The contract automatically:
    // 1. Mints full amount to user
    // 2. Takes 10% for gas reserve
    // 3. Swaps that 10% to ETH via Uniswap
    // 4. Sends ETH to user
    // User ends up with: 90% TXTC + ETH for gas
    
    res.json({
      success: true,
      tokenAmount: result.tokenAmount,
      ethAmount: result.ethAmount,
      txHash: result.txHash,
    });
  } catch (error: any) {
    console.error('❌ Redeem error:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// STEP 2: BALANCE Endpoint
// ============================================================================
app.get('/api/balance/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    console.log(`📊 Getting balance for ${address}`);
    
    const [txtcBalance, ethBalance] = await Promise.all([
      contractService.getTokenBalance(address),
      contractService.getEthBalance(address),
    ]);
    
    res.json({
      success: true,
      address,
      balances: {
        txtc: txtcBalance,
        eth: ethBalance,
      },
    });
  } catch (error: any) {
    console.error('❌ Balance error:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// STEP 3: SWAP Endpoint
// ============================================================================
app.post('/api/swap', async (req, res) => {
  try {
    const { userPrivateKey, tokenAmount, minEthOut = '0' } = req.body;
    
    if (!userPrivateKey || !tokenAmount) {
      return res.status(400).json({
        success: false,
        error: 'Missing userPrivateKey or tokenAmount',
      });
    }
    
    // Create wallet from user's private key
    const provider = new ethers.JsonRpcProvider(SEPOLIA_CONFIG.rpcUrl);
    const userWallet = new ethers.Wallet(userPrivateKey, provider);
    const userAddress = await userWallet.getAddress();
    
    console.log(`🔄 Swapping ${tokenAmount} TXTC to ETH for ${userAddress}`);
    
    // First, approve EntryPoint to spend tokens
    const tokenContract = new ethers.Contract(
      SEPOLIA_CONFIG.contracts.tokenXYZ,
      [
        'function approve(address spender, uint256 amount) returns (bool)',
        'function allowance(address owner, address spender) view returns (uint256)'
      ],
      userWallet
    );
    
    const amountWei = ethers.parseEther(tokenAmount);
    const entryPointAddress = SEPOLIA_CONFIG.contracts.entryPointV3;
    
    // Check current allowance
    const currentAllowance = await tokenContract.allowance(userAddress, entryPointAddress);
    
    if (currentAllowance < amountWei) {
      console.log(`Approving EntryPoint to spend ${tokenAmount} TXTC...`);
      const approveTx = await tokenContract.approve(entryPointAddress, amountWei);
      await approveTx.wait();
      console.log(`✅ Approval confirmed: ${approveTx.hash}`);
    }
    
    // Now perform the swap via EntryPoint
    const result = await contractService.swapTokenForEth(
      userAddress,
      tokenAmount,
      minEthOut
    );
    
    console.log(`✅ Swap successful: ${result.ethReceived} ETH`);
    
    res.json({
      success: true,
      ethReceived: result.ethReceived,
      txHash: result.txHash,
    });
  } catch (error: any) {
    console.error('❌ Swap error:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// STEP 4: SEND Endpoint (Token Transfer)
// ============================================================================
app.post('/api/send', async (req, res) => {
  try {
    const { userPrivateKey, toAddress, amount } = req.body;
    
    if (!userPrivateKey || !toAddress || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing userPrivateKey, toAddress, or amount',
      });
    }
    
    console.log(`💸 Sending ${amount} TXTC to ${toAddress}`);
    
    // Create wallet from user's private key
    const provider = new ethers.JsonRpcProvider(SEPOLIA_CONFIG.rpcUrl);
    const userWallet = new ethers.Wallet(userPrivateKey, provider);
    const fromAddress = await userWallet.getAddress();
    
    console.log(`From: ${fromAddress}`);
    
    // Create token contract instance
    const tokenContract = new ethers.Contract(
      SEPOLIA_CONFIG.contracts.tokenXYZ,
      ['function transfer(address to, uint256 amount) returns (bool)'],
      userWallet
    );
    
    // Execute transfer
    const amountWei = ethers.parseEther(amount);
    const tx = await tokenContract.transfer(toAddress, amountWei);
    
    console.log(`TX sent: ${tx.hash}`);
    await tx.wait();
    console.log(`✅ Transfer confirmed`);
    
    res.json({
      success: true,
      txHash: tx.hash,
    });
  } catch (error: any) {
    console.error('❌ Send error:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// Utility Endpoints
// ============================================================================

// Get current pool price
app.get('/api/price', async (req, res) => {
  try {
    const price = await contractService.getCurrentPrice();
    
    res.json({
      success: true,
      price,
      description: '1 TXTC = ' + price + ' ETH',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get swap quote
app.post('/api/quote', async (req, res) => {
  try {
    const { amount, isTokenToEth = true } = req.body;
    
    const quote = await contractService.estimateSwapOutput(amount, isTokenToEth);
    
    res.json({
      success: true,
      inputAmount: amount,
      outputAmount: quote,
      direction: isTokenToEth ? 'TXTC → ETH' : 'ETH → TXTC',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Contract addresses info
app.get('/api/contracts', (req, res) => {
  res.json({
    success: true,
    network: SEPOLIA_CONFIG.network,
    chainId: SEPOLIA_CONFIG.chainId,
    contracts: SEPOLIA_CONFIG.contracts,
    etherscan: SEPOLIA_CONFIG.etherscan.baseUrl,
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('🚀 Contract API Server Started');
  console.log('================================');
  console.log(`Port: ${PORT}`);
  console.log(`Network: ${SEPOLIA_CONFIG.network}`);
  console.log(`Chain ID: ${SEPOLIA_CONFIG.chainId}`);
  console.log('\n📋 Available Endpoints:');
  console.log('  POST /api/redeem    - Redeem voucher');
  console.log('  GET  /api/balance/:address - Get balance');
  console.log('  POST /api/swap      - Swap tokens for ETH');
  console.log('  POST /api/send      - Send tokens');
  console.log('  GET  /api/price     - Get current price');
  console.log('  POST /api/quote     - Get swap quote');
  console.log('  GET  /api/contracts - Contract addresses');
  console.log('  GET  /health        - Health check');
  console.log('\n✅ Ready to receive requests from SMS handler!');
  console.log('================================\n');
});

export default app;
