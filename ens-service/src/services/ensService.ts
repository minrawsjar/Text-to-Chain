import { ethers, Contract, Wallet } from 'ethers';
import ENSRegistryABI from '../abis/ENSRegistry.json';

export interface NameRegistration {
    name: string;
    owner: string;
    expiresAt: number;
    isActive: boolean;
}

export class ENSService {
    private contract: Contract;
    private wallet: Wallet;

    constructor(contractAddress: string, wallet: Wallet) {
        this.wallet = wallet;
        this.contract = new Contract(contractAddress, ENSRegistryABI, wallet);
    }

    /**
     * Register a name for a wallet address
     */
    async registerName(name: string, ownerAddress: string): Promise<string> {
        const fee = await this.contract.registrationFee();
        
        const tx = await this.contract.registerName(name, ownerAddress, {
            value: fee
        });
        
        await tx.wait();
        return tx.hash;
    }

    /**
     * Check if a name is available
     */
    async isAvailable(name: string): Promise<boolean> {
        return await this.contract.isAvailable(name);
    }

    /**
     * Resolve name to address
     */
    async resolve(name: string): Promise<string> {
        return await this.contract.resolve(name);
    }

    /**
     * Reverse resolve address to name
     */
    async reverseResolve(address: string): Promise<string> {
        return await this.contract.reverseResolve(address);
    }

    /**
     * Get full name with domain
     */
    getFullName(name: string): string {
        return `${name}.textchain.eth`;
    }

    /**
     * Validate name format
     */
    validateName(name: string): { valid: boolean; error?: string } {
        if (!name || name.length === 0) {
            return { valid: false, error: 'Name cannot be empty' };
        }
        
        if (name.length > 32) {
            return { valid: false, error: 'Name too long (max 32 characters)' };
        }
        
        // Only alphanumeric and hyphens
        if (!/^[a-z0-9-]+$/.test(name)) {
            return { valid: false, error: 'Name can only contain lowercase letters, numbers, and hyphens' };
        }
        
        // Cannot start or end with hyphen
        if (name.startsWith('-') || name.endsWith('-')) {
            return { valid: false, error: 'Name cannot start or end with a hyphen' };
        }
        
        return { valid: true };
    }

    /**
     * Get name suggestions if requested name is taken
     */
    async getNameSuggestions(baseName: string): Promise<string[]> {
        const suggestions: string[] = [];
        
        // Try with numbers
        for (let i = 1; i <= 5; i++) {
            const suggestion = `${baseName}${i}`;
            if (await this.isAvailable(suggestion)) {
                suggestions.push(suggestion);
            }
        }
        
        // Try with random suffix
        const randomSuffix = Math.floor(Math.random() * 1000);
        const randomSuggestion = `${baseName}${randomSuffix}`;
        if (await this.isAvailable(randomSuggestion)) {
            suggestions.push(randomSuggestion);
        }
        
        return suggestions.slice(0, 3);
    }

    /**
     * Get registration fee
     */
    async getRegistrationFee(): Promise<string> {
        const fee = await this.contract.registrationFee();
        return ethers.utils.formatEther(fee);
    }
}
