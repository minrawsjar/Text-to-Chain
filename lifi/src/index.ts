import {
  checkAndSetAllowance,
  getQuote,
  getStatus,
  validateQuote,
} from "./services/lifi/api.ts";
import { ChainIds } from "./config/chains.ts";
import { TOKENS } from "./config/tokens.ts";
import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { getGasSuggestion } from "./services/lifi/api.ts";
import { initializeLifi } from "./config/index.ts";
dotenv.config();

initializeLifi();

const run = async () => {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_PROVIDER_URL);
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) throw new Error("PRIVATE_KEY not set");
  const wallet = new ethers.Wallet(privateKey, provider);

  // Get gas suggestion first
  const fromChain = ChainIds.POLYGON;
  const toChain = ChainIds.OPTIMISM;
  const fromToken = TOKENS.USDC[fromChain];
  const toToken = TOKENS.USDC[toChain];
  const fromAmount = "100000"; // 1 USDC with 6 decimals
  const toAddress = "0xe4F4c768d628074C8a975126D517a60A03848f69";

  const gasSuggestion = await getGasSuggestion(fromChain);
  console.log("Recommended gas on Polygon:", gasSuggestion);

  const quote = await getQuote({
    fromChain,
    toChain,
    fromToken,
    toToken,
    fromAmount,
    fromAddress: await wallet.getAddress(),
    toAddress,
    integrator: "TTC",
    slippage: 0.005, // 0.5% slippage
    order: "CHEAPEST", // or "FASTEST"
    maxPriceImpact: 0.1, // Hide routes with >10% price impact
  });

  // Validate before proceeding
  if (!validateQuote(quote)) {
    throw new Error("Quote validation failed");
  }

  console.log("Estimated output:", quote.estimate.toAmount);
  console.log("Minimum output:", quote.estimate.toAmountMin);
  console.log("Execution time:", quote.estimate.executionDuration, "seconds");

  // Set allowance
  await checkAndSetAllowance(
    wallet,
    quote.action.fromToken.address,
    quote.estimate.approvalAddress,
    quote.action.fromAmount,
  );

  // Execute transaction
  const { from, ...txRequest } = quote.transactionRequest;
  const tx = await wallet.sendTransaction(txRequest);
  console.log("TX sent:", tx.hash);
  await tx.wait();

  // Enhanced status polling with timeout
  if (quote.action.fromChainId !== quote.action.toChainId) {
    const maxWaitTime = 30 * 60 * 1000; // 30 minutes
    const startTime = Date.now();
    let status;

    do {
      status = await getStatus(
        tx.hash,
        quote.action.fromChainId,
        quote.action.toChainId,
      );
      console.log(
        `Status: ${status.status} | Substatus: ${status.substatus || "N/A"}`,
      );

      if (Date.now() - startTime > maxWaitTime) {
        console.warn("Timeout waiting for completion. Check LI.FI scanner.");
        break;
      }

      await new Promise((r) => setTimeout(r, 10000)); // Poll every 10s
    } while (status.status !== "DONE" && status.status !== "FAILED");

    if (status.status === "FAILED") {
      console.error("Transfer failed:", status.substatusMessage);
    }
  }

  console.log("Done!");
};

run().catch(console.error);
