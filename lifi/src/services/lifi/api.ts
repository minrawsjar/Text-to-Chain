// API wrapper for LI.FI endpoints
import axios from "axios";
import type { QuoteParams } from "../../types/index.js";
import { ethers, Contract } from "ethers";
import { ERC20_ABI } from "../../erc20.abi.ts";

const API_URL = "https://li.quest/v1";
const headers = { "x-lifi-api-key": process.env.LIFI_API_KEY };

export const getQuote = async (params: QuoteParams) => {
  try {
    const result = await axios.get(`${API_URL}/quote`, {
      params,
      headers,
    });
    return result.data;
  } catch (error: any) {
    if (error.response?.data?.errors) {
      // Handle specific LI.FI error codes
      const errors = error.response.data.errors;
      for (const err of errors) {
        console.error(
          `Tool: ${err.tool}, Code: ${err.code}, Message: ${err.message}`,
        );
      }
    }
    throw error;
  }
};

// export const getRoutes = async (params: RoutesParams) => {
//   /* axios.post */
// };

export const checkAndSetAllowance = async (
  wallet: ethers.Wallet,
  tokenAddress: string,
  approvalAddress: string,
  amount: string,
  maxRetries = 3,
) => {
  if (tokenAddress === ethers.ZeroAddress) {
    return; // Native token
  }
  const NATIVE_TOKEN = "0x0000000000000000000000000000000000000000";
  const erc20 = new Contract(tokenAddress, ERC20_ABI, wallet);
  if (tokenAddress.toLowerCase() === NATIVE_TOKEN.toLowerCase()) {
    console.log("Native token - no approval needed");
    return;
  }
  // const allowance = await erc20.allowance(
  //   await wallet.getAddress(),
  //   approvalAddress,
  // );

  //  const erc20 = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
  const allowance = await erc20.allowance(
    await wallet.getAddress(),
    approvalAddress,
  );
  if (allowance < BigInt(amount)) {
    // Approve max amount to avoid future approvals
    const tx = await erc20.approve(approvalAddress, ethers.MaxUint256);
    console.log("Approval TX sent:", tx.hash);
    await tx.wait();
    console.log("Approval confirmed!");
  }
};

export const getStatus = async (
  txHash: string,
  fromChain?: number,
  toChain?: number,
) => {
  const result = await axios.get(`${API_URL}/status`, {
    params: { txHash, fromChain, toChain }, // fromChain speeds up request
  });
  return result.data;
};

export const getGasSuggestion = async (chain: number) => {
  const result = await axios.get(`${API_URL}/gas/suggestion/${chain}`);
  return result.data;
};

export const validateQuote = (quote: any): boolean => {
  // Check for high price impact
  const priceImpact = parseFloat(quote.estimate?.priceImpact || "0");
  if (priceImpact > 0.1) {
    // 10%
    console.warn(`High price impact: ${priceImpact * 100}%`);
    return false;
  }

  // Check minimum received amount
  const toAmountMin = BigInt(quote.estimate?.toAmountMin || "0");
  if (toAmountMin === 0n) {
    console.error("Invalid minimum amount");
    return false;
  }

  return true;
};
// export const getConnections = async (params: ConnectionsParams) => {
//   /* ... */
// };
