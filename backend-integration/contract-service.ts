/**
 * Contract Service for Text-to-Chain Backend
 * Handles all smart contract interactions
 */

import { ethers } from 'ethers';
import { SEPOLIA_CONFIG } from './contracts.config';

// Load ABIs using require to get the actual array
const EntryPointV3ABI = require('./EntryPointV3.abi.json');
const TokenXYZABI = require('./TokenXYZ.abi.json');
const VoucherManagerABI = require('./VoucherManager.abi.json');

export class ContractService {
  private provider: ethers.Provider;
  private signer: ethers.Wallet;
  
  // Contract instances
  private entryPoint: ethers.Contract;
  private tokenXYZ: ethers.Contract;
  private voucherManager: ethers.Contract;
  
  constructor(privateKey: string) {
    this.provider = new ethers.JsonRpcProvider(SEPOLIA_CONFIG.rpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);
    
    // Initialize contracts
    this.entryPoint = new ethers.Contract(
      SEPOLIA_CONFIG.contracts.entryPointV3,
      EntryPointV3ABI,
      this.signer
    );
    
    this.tokenXYZ = new ethers.Contract(
      SEPOLIA_CONFIG.contracts.tokenXYZ,
      TokenXYZABI,
      this.signer
    );
    
    this.voucherManager = new ethers.Contract(
      SEPOLIA_CONFIG.contracts.voucherManager,
      VoucherManagerABI,
      this.signer
    );
  }
  
  /**
   * Redeem voucher for user
   * SMS Command: REDEEM <code>
   */
  async redeemVoucher(
    voucherCode: string,
    userAddress: string,
    autoSwapToEth: boolean = true
  ): Promise<{
    success: boolean;
    tokenAmount: string;
    ethAmount: string;
    txHash: string;
  }> {
    try {
      const tx = await this.entryPoint.redeemVoucher(
        voucherCode,
        userAddress,
        autoSwapToEth
      );
      
      const receipt = await tx.wait();
      
      // Parse events to get amounts
      const event = receipt.logs.find((log: any) => 
        log.topics[0] === ethers.id('VoucherRedeemed(address,uint256,uint256,uint256)')
      );
      
      if (event) {
        const decoded = this.entryPoint.interface.parseLog(event);
        if (decoded) {
          return {
            success: true,
            tokenAmount: ethers.formatEther(decoded.args.tokenAmount),
            ethAmount: ethers.formatEther(decoded.args.ethAmount),
            txHash: receipt.hash,
          };
        }
      }
      
      return {
        success: true,
        tokenAmount: '0',
        ethAmount: '0',
        txHash: receipt.hash,
      };
    } catch (error: any) {
      console.error('Redeem voucher error:', error);
      throw new Error(`Failed to redeem voucher: ${error.message}`);
    }
  }
  
  /**
   * Swap tokens for ETH
   * SMS Command: SWAP <amount> TXTC
   */
  async swapTokenForEth(
    userAddress: string,
    tokenAmount: string,
    minEthOut: string = '0'
  ): Promise<{
    success: boolean;
    ethReceived: string;
    txHash: string;
  }> {
    try {
      const amountWei = ethers.parseEther(tokenAmount);
      const minOutWei = ethers.parseEther(minEthOut);
      
      const tx = await this.entryPoint.swapTokenForEth(
        userAddress,
        amountWei,
        minOutWei
      );
      
      const receipt = await tx.wait();
      
      // Parse swap event
      const event = receipt.logs.find((log: any) =>
        log.topics[0] === ethers.id('TokensSwapped(address,uint256,uint256,bool)')
      );
      
      if (event) {
        const decoded = this.entryPoint.interface.parseLog(event);
        if (decoded) {
          return {
            success: true,
            ethReceived: ethers.formatEther(decoded.args.amountOut),
            txHash: receipt.hash,
          };
        }
      }
      
      return {
        success: true,
        ethReceived: '0',
        txHash: receipt.hash,
      };
    } catch (error: any) {
      console.error('Swap error:', error);
      throw new Error(`Failed to swap tokens: ${error.message}`);
    }
  }
  
  /**
   * Get user token balance
   * SMS Command: BALANCE
   */
  async getTokenBalance(userAddress: string): Promise<string> {
    try {
      const balance = await this.tokenXYZ.balanceOf(userAddress);
      return ethers.formatEther(balance);
    } catch (error: any) {
      console.error('Get balance error:', error);
      throw new Error(`Failed to get balance: ${error.message}`);
    }
  }
  
  /**
   * Get user ETH balance
   */
  async getEthBalance(userAddress: string): Promise<string> {
    try {
      const balance = await this.provider.getBalance(userAddress);
      return ethers.formatEther(balance);
    } catch (error: any) {
      console.error('Get ETH balance error:', error);
      throw new Error(`Failed to get ETH balance: ${error.message}`);
    }
  }
  
  /**
   * Send tokens to another user
   * SMS Command: SEND <amount> <phone>
   */
  async sendTokens(
    fromAddress: string,
    toAddress: string,
    amount: string
  ): Promise<{
    success: boolean;
    txHash: string;
  }> {
    try {
      const amountWei = ethers.parseEther(amount);
      
      // This would need to be called by the user's wallet
      // For backend, we'd need to handle this differently
      const tx = await this.tokenXYZ.transfer(toAddress, amountWei);
      const receipt = await tx.wait();
      
      return {
        success: true,
        txHash: receipt.hash,
      };
    } catch (error: any) {
      console.error('Send tokens error:', error);
      throw new Error(`Failed to send tokens: ${error.message}`);
    }
  }
  
  /**
   * Get current pool price
   */
  async getCurrentPrice(): Promise<string> {
    try {
      const poolManager = new ethers.Contract(
        SEPOLIA_CONFIG.contracts.uniswapV3PoolManager,
        ['function getCurrentPrice() view returns (uint160)'],
        this.provider
      );
      
      const price = await poolManager.getCurrentPrice();
      return price.toString();
    } catch (error: any) {
      console.error('Get price error:', error);
      throw new Error(`Failed to get price: ${error.message}`);
    }
  }
  
  /**
   * Estimate swap output
   */
  async estimateSwapOutput(
    tokenAmount: string,
    isTokenToEth: boolean
  ): Promise<string> {
    try {
      const amountWei = ethers.parseEther(tokenAmount);
      
      const quote = await this.entryPoint.getSwapQuote(amountWei, isTokenToEth);
      return ethers.formatEther(quote);
    } catch (error: any) {
      console.error('Estimate swap error:', error);
      return '0';
    }
  }

  /**
   * Send ETH for gas fees to a user
   */
  async sendGasFee(toAddress: string, amount: string): Promise<string> {
    try {
      const tx = await this.signer.sendTransaction({
        to: toAddress,
        value: ethers.parseEther(amount),
      });
      await tx.wait();
      return tx.hash;
    } catch (error: any) {
      throw new Error(`Failed to send gas fee: ${error.message}`);
    }
  }
}

// Export singleton instance
let contractServiceInstance: ContractService | null = null;

export function getContractService(privateKey?: string): ContractService {
  if (!contractServiceInstance) {
    if (!privateKey) {
      throw new Error('Private key required for first initialization');
    }
    contractServiceInstance = new ContractService(privateKey);
  }
  return contractServiceInstance;
}
