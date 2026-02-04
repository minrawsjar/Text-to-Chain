import axios from 'axios';
import { ethers } from 'ethers';

const LIFI_API_URL = 'https://li.quest/v1';

interface QuoteParams {
  fromChain: number;
  toChain: number;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string;
  toAddress: string;
  integrator: string;
  slippage?: number;
  order?: 'CHEAPEST' | 'FASTEST';
}

interface LifiQuote {
  estimate: {
    toAmount: string;
    toAmountMin: string;
    approvalAddress: string;
    executionDuration: number;
  };
  action: {
    fromToken: { address: string };
    fromAmount: string;
    fromChainId: number;
    toChainId: number;
  };
  transactionRequest: any;
}

export class LifiService {
  private apiKey: string | undefined;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  /**
   * Get a quote for token transfer (same-chain or cross-chain)
   */
  async getQuote(params: QuoteParams): Promise<LifiQuote> {
    try {
      const headers = this.apiKey ? { 'x-lifi-api-key': this.apiKey } : {};
      
      const response = await axios.get(`${LIFI_API_URL}/quote`, {
        params,
        headers,
      });

      return response.data;
    } catch (error: any) {
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        const errorMessages = errors.map((err: any) => 
          `${err.tool}: ${err.message}`
        ).join(', ');
        throw new Error(`Li.Fi error: ${errorMessages}`);
      }
      throw new Error(`Failed to get Li.Fi quote: ${error.message}`);
    }
  }

  /**
   * Check and set token allowance if needed
   */
  async checkAndSetAllowance(
    wallet: ethers.Wallet,
    tokenAddress: string,
    approvalAddress: string,
    amount: string
  ): Promise<string | null> {
    // Native token doesn't need approval
    if (tokenAddress === ethers.ZeroAddress) {
      return null;
    }

    const erc20Abi = [
      'function allowance(address owner, address spender) view returns (uint256)',
      'function approve(address spender, uint256 amount) returns (bool)',
    ];

    const erc20 = new ethers.Contract(tokenAddress, erc20Abi, wallet);
    const walletAddress = await wallet.getAddress();
    const allowance = await erc20.allowance(walletAddress, approvalAddress);

    if (allowance < BigInt(amount)) {
      console.log(`Setting allowance for ${tokenAddress}...`);
      const tx = await erc20.approve(approvalAddress, ethers.MaxUint256);
      await tx.wait();
      console.log(`Allowance set: ${tx.hash}`);
      return tx.hash;
    }

    return null;
  }

  /**
   * Execute a transfer using Li.Fi
   */
  async executeTransfer(
    wallet: ethers.Wallet,
    fromToken: string,
    toToken: string,
    amount: string,
    toAddress: string,
    fromChain: number = 11155111, // Sepolia
    toChain: number = 11155111 // Sepolia (same-chain transfer)
  ): Promise<{ txHash: string; estimatedOutput: string }> {
    try {
      const fromAddress = await wallet.getAddress();

      console.log(`Getting Li.Fi quote for transfer...`);
      console.log(`From: ${fromAddress} on chain ${fromChain}`);
      console.log(`To: ${toAddress} on chain ${toChain}`);
      console.log(`Amount: ${amount} of token ${fromToken}`);

      // Get quote
      const quote = await this.getQuote({
        fromChain,
        toChain,
        fromToken,
        toToken,
        fromAmount: amount,
        fromAddress,
        toAddress,
        integrator: 'TextToChain',
        slippage: 0.005, // 0.5%
        order: 'CHEAPEST',
      });

      console.log(`Estimated output: ${quote.estimate.toAmount}`);
      console.log(`Minimum output: ${quote.estimate.toAmountMin}`);

      // Set allowance if needed
      await this.checkAndSetAllowance(
        wallet,
        quote.action.fromToken.address,
        quote.estimate.approvalAddress,
        quote.action.fromAmount
      );

      // Execute transaction
      const { from, ...txRequest } = quote.transactionRequest;
      const tx = await wallet.sendTransaction(txRequest);
      
      console.log(`Transfer TX sent: ${tx.hash}`);
      await tx.wait();
      console.log(`Transfer confirmed!`);

      return {
        txHash: tx.hash,
        estimatedOutput: quote.estimate.toAmount,
      };
    } catch (error: any) {
      console.error('Li.Fi transfer error:', error);
      throw new Error(`Failed to execute transfer: ${error.message}`);
    }
  }

  /**
   * Get transaction status
   */
  async getStatus(txHash: string, fromChain?: number, toChain?: number) {
    try {
      const response = await axios.get(`${LIFI_API_URL}/status`, {
        params: { txHash, fromChain, toChain },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get status: ${error.message}`);
    }
  }
}

export const lifiService = new LifiService(process.env.LIFI_API_KEY);
