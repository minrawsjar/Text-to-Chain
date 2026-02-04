/**
 * Example Usage of Contract Service
 * Text-to-Chain Backend Integration
 */

import { getContractService } from './contract-service';
import { SEPOLIA_CONFIG } from './contracts.config';

// Initialize service (do this once at app startup)
const contractService = getContractService(process.env.PRIVATE_KEY!);

// ============================================================================
// Example 1: Handle REDEEM command
// ============================================================================
async function handleRedeemCommand(
  voucherCode: string,
  userAddress: string
): Promise<void> {
  try {
    console.log(`Redeeming voucher ${voucherCode} for ${userAddress}...`);
    
    const result = await contractService.redeemVoucher(
      voucherCode,
      userAddress,
      true // auto-swap to ETH
    );
    
    console.log('✓ Voucher redeemed successfully!');
    console.log(`  Token amount: ${result.tokenAmount} TXTC`);
    console.log(`  ETH received: ${result.ethAmount} ETH`);
    console.log(`  TX: ${result.txHash}`);
    
    // Send SMS to user
    // await sms.send(userPhone, `✓ Received ${result.ethAmount} ETH!`);
    
  } catch (error: any) {
    console.error('Failed to redeem voucher:', error.message);
    
    if (error.message.includes('invalid code')) {
      // await sms.send(userPhone, '❌ Invalid voucher code');
    } else {
      // await sms.send(userPhone, '❌ Redemption failed. Try again.');
    }
  }
}

// ============================================================================
// Example 2: Handle BALANCE command
// ============================================================================
async function handleBalanceCommand(userAddress: string): Promise<void> {
  try {
    const txtcBalance = await contractService.getTokenBalance(userAddress);
    const ethBalance = await contractService.getEthBalance(userAddress);
    
    console.log(`Balance for ${userAddress}:`);
    console.log(`  TXTC: ${txtcBalance}`);
    console.log(`  ETH: ${ethBalance}`);
    
    // Send SMS
    // await sms.send(userPhone, `Balance:\nTXTC: ${txtcBalance}\nETH: ${ethBalance}`);
    
  } catch (error: any) {
    console.error('Failed to get balance:', error.message);
  }
}

// ============================================================================
// Example 3: Handle SWAP command
// ============================================================================
async function handleSwapCommand(
  amount: string,
  userAddress: string
): Promise<void> {
  try {
    console.log(`Swapping ${amount} TXTC for ETH...`);
    
    // Get quote first
    const quote = await contractService.estimateSwapOutput(amount, true);
    console.log(`  Estimated output: ${quote} ETH`);
    
    // Execute swap
    const result = await contractService.swapTokenForEth(
      userAddress,
      amount,
      '0' // min ETH out (adjust for slippage in production)
    );
    
    console.log('✓ Swap successful!');
    console.log(`  ETH received: ${result.ethReceived}`);
    console.log(`  TX: ${result.txHash}`);
    
    // Send SMS
    // await sms.send(userPhone, `✓ Swapped ${amount} TXTC for ${result.ethReceived} ETH`);
    
  } catch (error: any) {
    console.error('Failed to swap:', error.message);
    // await sms.send(userPhone, '❌ Swap failed. Try again.');
  }
}

// ============================================================================
// Example 4: Get current pool price
// ============================================================================
async function getCurrentPoolPrice(): Promise<void> {
  try {
    const price = await contractService.getCurrentPrice();
    console.log(`Current pool price: 1 TXTC = ${price} ETH`);
  } catch (error: any) {
    console.error('Failed to get price:', error.message);
  }
}

// ============================================================================
// Example 5: Complete SMS flow simulation
// ============================================================================
async function simulateSMSFlow() {
  console.log('\n=== Simulating SMS Flow ===\n');
  
  // User sends: "REDEEM ABC123"
  console.log('User SMS: REDEEM ABC123');
  await handleRedeemCommand(
    'ABC123',
    '0xUserWalletAddress'
  );
  
  console.log('\n---\n');
  
  // User sends: "BALANCE"
  console.log('User SMS: BALANCE');
  await handleBalanceCommand('0xUserWalletAddress');
  
  console.log('\n---\n');
  
  // User sends: "SWAP 100 TXTC"
  console.log('User SMS: SWAP 100 TXTC');
  await handleSwapCommand('100', '0xUserWalletAddress');
  
  console.log('\n---\n');
  
  // Check pool price
  console.log('Checking pool price...');
  await getCurrentPoolPrice();
}

// ============================================================================
// Run examples
// ============================================================================
if (require.main === module) {
  simulateSMSFlow()
    .then(() => {
      console.log('\n✓ All examples completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error:', error);
      process.exit(1);
    });
}

export {
  handleRedeemCommand,
  handleBalanceCommand,
  handleSwapCommand,
  getCurrentPoolPrice,
};
