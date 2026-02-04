import express from 'express';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import { ENSService } from './services/ensService';
import { registerRoutes } from './routes';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.ENS_SERVICE_PORT || 3002;

// Initialize ENS Service
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

const ensService = new ENSService(
    process.env.ENS_REGISTRY_ADDRESS!,
    wallet
);

// Register routes
registerRoutes(app, ensService);

app.listen(PORT, () => {
    console.log(`ENS Service running on port ${PORT}`);
    console.log(`ENS Registry: ${process.env.ENS_REGISTRY_ADDRESS}`);
});

export { ensService };
