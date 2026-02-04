import { Express, Request, Response } from 'express';
import { ENSService } from '../services/ensService';

export function registerRoutes(app: Express, ensService: ENSService) {
    
    /**
     * POST /register
     * Register a new ENS name
     */
    app.post('/register', async (req: Request, res: Response) => {
        try {
            const { name, ownerAddress } = req.body;
            
            if (!name || !ownerAddress) {
                return res.status(400).json({
                    error: 'Missing required fields: name, ownerAddress'
                });
            }
            
            // Validate name format
            const validation = ensService.validateName(name.toLowerCase());
            if (!validation.valid) {
                return res.status(400).json({ error: validation.error });
            }
            
            const normalizedName = name.toLowerCase();
            
            // Check availability
            const available = await ensService.isAvailable(normalizedName);
            if (!available) {
                const suggestions = await ensService.getNameSuggestions(normalizedName);
                return res.status(409).json({
                    error: 'Name already taken',
                    suggestions
                });
            }
            
            // Register
            const txHash = await ensService.registerName(normalizedName, ownerAddress);
            
            res.json({
                success: true,
                name: ensService.getFullName(normalizedName),
                txHash
            });
            
        } catch (error: any) {
            console.error('Registration error:', error);
            res.status(500).json({ error: error.message });
        }
    });
    
    /**
     * GET /check/:name
     * Check if a name is available
     */
    app.get('/check/:name', async (req: Request, res: Response) => {
        try {
            const name = req.params.name.toLowerCase();
            
            const validation = ensService.validateName(name);
            if (!validation.valid) {
                return res.status(400).json({ error: validation.error });
            }
            
            const available = await ensService.isAvailable(name);
            
            res.json({
                name: ensService.getFullName(name),
                available
            });
            
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });
    
    /**
     * GET /resolve/:name
     * Resolve name to address
     */
    app.get('/resolve/:name', async (req: Request, res: Response) => {
        try {
            const name = req.params.name.toLowerCase();
            const address = await ensService.resolve(name);
            
            if (address === '0x0000000000000000000000000000000000000000') {
                return res.status(404).json({ error: 'Name not found' });
            }
            
            res.json({
                name: ensService.getFullName(name),
                address
            });
            
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });
    
    /**
     * GET /reverse/:address
     * Reverse resolve address to name
     */
    app.get('/reverse/:address', async (req: Request, res: Response) => {
        try {
            const address = req.params.address;
            const name = await ensService.reverseResolve(address);
            
            if (!name) {
                return res.status(404).json({ error: 'No name registered for this address' });
            }
            
            res.json({
                address,
                name: ensService.getFullName(name)
            });
            
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });
    
    /**
     * GET /suggestions/:name
     * Get name suggestions
     */
    app.get('/suggestions/:name', async (req: Request, res: Response) => {
        try {
            const name = req.params.name.toLowerCase();
            const suggestions = await ensService.getNameSuggestions(name);
            
            res.json({
                baseName: name,
                suggestions: suggestions.map(s => ensService.getFullName(s))
            });
            
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });
    
    /**
     * GET /fee
     * Get registration fee
     */
    app.get('/fee', async (req: Request, res: Response) => {
        try {
            const fee = await ensService.getRegistrationFee();
            res.json({ fee: `${fee} ETH` });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });
    
    /**
     * Health check
     */
    app.get('/health', (req: Request, res: Response) => {
        res.json({ status: 'ok', service: 'ens-service' });
    });
}
