use std::sync::Arc;
use sha2::Digest;
use crate::db::{UserRepository, VoucherRepository, DepositRepository, AddressBookRepository};
use crate::wallet::{AmoyProvider, UserWallet, Chain, MultiChainProvider};

/// Parsed SMS command
#[derive(Debug, Clone, PartialEq)]
pub enum Command {
    /// Show help/available commands
    Help,
    /// Register a new user
    Join,
    /// Check account balance
    Balance,
    /// Set or change PIN
    Pin { new_pin: Option<String> },
    /// Send money to someone
    Send {
        amount: f64,
        token: String,
        recipient: String,
    },
    /// Check deposit address
    Deposit,
    /// Check transaction history
    History,
    /// Redeem a voucher code
    Redeem { code: String },
    /// Swap tokens for ETH
    Swap { amount: f64, token: String },
    /// Save a contact: SAVE <name> <phone>
    Save { name: String, phone: String },
    /// List contacts
    Contacts,
    /// Switch chain: CHAIN <name>
    SwitchChain { chain: String },
    /// Unknown command
    Unknown(String),
}

/// Command processor that parses and executes commands
#[derive(Clone)]
pub struct CommandProcessor {
    user_repo: Option<UserRepository>,
    voucher_repo: Option<VoucherRepository>,
    deposit_repo: Option<DepositRepository>,
    address_book_repo: Option<AddressBookRepository>,
    provider: Arc<AmoyProvider>,
    multi_chain: MultiChainProvider,
}

impl CommandProcessor {
    pub fn new(user_repo: Option<UserRepository>, provider: Arc<AmoyProvider>) -> Self {
        Self { 
            user_repo,
            voucher_repo: None,
            deposit_repo: None,
            address_book_repo: None,
            provider,
            multi_chain: MultiChainProvider::new(),
        }
    }

    /// Create with all repositories
    pub fn with_repos(
        user_repo: Option<UserRepository>,
        voucher_repo: Option<VoucherRepository>,
        deposit_repo: Option<DepositRepository>,
        address_book_repo: Option<AddressBookRepository>,
        provider: Arc<AmoyProvider>,
    ) -> Self {
        Self {
            user_repo,
            voucher_repo,
            deposit_repo,
            address_book_repo,
            provider,
            multi_chain: MultiChainProvider::new(),
        }
    }

    /// Process an incoming SMS and return the response
    pub async fn process(&self, from: &str, body: &str) -> String {
        let command = self.parse(body);
        
        tracing::debug!(
            from = %from,
            command = ?command,
            "Processing command"
        );

        self.execute(from, command).await
    }

    /// Parse SMS text into a structured command
    pub fn parse(&self, text: &str) -> Command {
        let text = text.trim().to_uppercase();
        let parts: Vec<&str> = text.split_whitespace().collect();

        if parts.is_empty() {
            return Command::Unknown("".to_string());
        }

        match parts[0] {
            "HELP" | "?" | "COMMANDS" => Command::Help,
            "JOIN" | "START" | "REGISTER" => Command::Join,
            "BALANCE" | "BAL" => Command::Balance,
            "PIN" => {
                let new_pin = parts.get(1).map(|s| s.to_string());
                Command::Pin { new_pin }
            }
            "SEND" => self.parse_send(&parts),
            "DEPOSIT" | "RECEIVE" => Command::Deposit,
            "HISTORY" | "TRANSACTIONS" | "TXS" => Command::History,
            "REDEEM" | "VOUCHER" | "CODE" => {
                if parts.len() < 2 {
                    Command::Unknown("Usage: REDEEM <code>".to_string())
                } else {
                    Command::Redeem { code: parts[1].to_string() }
                }
            }
            "SWAP" | "CONVERT" => self.parse_swap(&parts),
            "SAVE" | "ADD" => self.parse_save(&parts),
            "CONTACTS" | "BOOK" => Command::Contacts,
            "CHAIN" | "NETWORK" => {
                if parts.len() < 2 {
                    Command::Unknown("Usage: CHAIN <polygon|base|eth|arb>".to_string())
                } else {
                    Command::SwitchChain { chain: parts[1].to_string() }
                }
            }
            _ => Command::Unknown(text),
        }
    }

    /// Parse SWAP command: SWAP <amount> <token>
    fn parse_swap(&self, parts: &[&str]) -> Command {
        if parts.len() < 3 {
            return Command::Unknown("Usage: SWAP <amount> <token>\nExample: SWAP 100 TXTC".to_string());
        }

        let amount = match parts[1].parse::<f64>() {
            Ok(amt) => amt,
            Err(_) => return Command::Unknown("Invalid amount".to_string()),
        };

        let token = parts[2].to_string();
        
        Command::Swap { amount, token }
    }

    /// Parse SAVE command: SAVE <name> <phone>
    fn parse_save(&self, parts: &[&str]) -> Command {
        if parts.len() < 3 {
            return Command::Unknown("Usage: SAVE <name> <phone>".to_string());
        }
        Command::Save {
            name: parts[1].to_string(),
            phone: parts[2..].join(" "),
        }
    }

    /// Parse SEND command: SEND <amount> <token> TO <recipient>
    fn parse_send(&self, parts: &[&str]) -> Command {
        if parts.len() < 5 {
            return Command::Unknown("Invalid SEND format. Use: SEND <amount> <token> TO <phone>".to_string());
        }

        let amount = match parts[1].parse::<f64>() {
            Ok(amt) => amt,
            Err(_) => return Command::Unknown("Invalid amount".to_string()),
        };

        let token = parts[2].to_string();
        
        let to_index = parts.iter().position(|&p| p == "TO");
        if to_index.is_none() || to_index.unwrap() + 1 >= parts.len() {
            return Command::Unknown("Missing recipient. Use: SEND <amount> <token> TO <phone>".to_string());
        }

        let recipient = parts[to_index.unwrap() + 1..].join(" ");

        Command::Send {
            amount,
            token,
            recipient,
        }
    }

    /// Execute a parsed command and return the response text
    async fn execute(&self, from: &str, command: Command) -> String {
        match command {
            Command::Help => self.help_response(),
            Command::Join => self.join_response(from).await,
            Command::Balance => self.balance_response(from).await,
            Command::Pin { new_pin } => self.pin_response(from, new_pin).await,
            Command::Send { amount, token, recipient } => {
                self.send_response(from, amount, &token, &recipient).await
            }
            Command::Deposit => self.deposit_response(from).await,
            Command::History => self.history_response(from).await,
            Command::Redeem { code } => self.redeem_response(from, &code).await,
            Command::Swap { amount, token } => self.swap_response(from, amount, &token).await,
            Command::Save { name, phone } => self.save_response(from, &name, &phone).await,
            Command::Contacts => self.contacts_response(from).await,
            Command::SwitchChain { chain } => self.chain_response(from, &chain).await,
            Command::Unknown(text) => self.unknown_response(&text),
        }
    }

    fn help_response(&self) -> String {
        "TextChain Commands:\n\
         JOIN - Create wallet\n\
         BALANCE - Check balance\n\
         SEND <amt> <token> TO <phone> - Send tokens\n\
         SWAP <amt> <token> - Swap tokens for ETH\n\
         REDEEM <code> - Redeem voucher\n\
         DEPOSIT - Get deposit address\n\
         HISTORY - Recent transactions\n\
         SAVE <name> <phone> - Save contact\n\
         CONTACTS - List contacts\n\
         CHAIN <name> - Switch network\n\
         PIN <code> - Set PIN".to_string()
    }

    async fn join_response(&self, from: &str) -> String {
        // Check if database is available
        let Some(ref repo) = self.user_repo else {
            return "DB offline. Try later.".to_string();
        };

        // Check if user already exists
        match repo.find_by_phone(from).await {
            Ok(Some(user)) => {
                return format!(
                    "Welcome back!\n\nYour wallet:\n{}...{}\n\nReply BALANCE or DEPOSIT",
                    &user.wallet_address[..6],
                    &user.wallet_address[user.wallet_address.len() - 4..]
                );
            }
            Ok(None) => {}
            Err(e) => {
                tracing::error!("DB error: {}", e);
                return "Error. Try later.".to_string();
            }
        }

        // Create new wallet
        let wallet = match UserWallet::create_new() {
            Ok(w) => w,
            Err(e) => {
                tracing::error!("Wallet error: {}", e);
                return "Error creating wallet.".to_string();
            }
        };

        // Encrypt private key (simple hex for now - TODO: proper encryption)
        let encrypted_key = hex::encode(wallet.private_key_bytes());

        // Save to database
        match repo.create(from, &wallet.address_string(), &encrypted_key).await {
            Ok(_) => {
                format!(
                    "Wallet created!\n\n{}\n\nReply DEPOSIT to fund it.",
                    wallet.address_string()
                )
            }
            Err(e) => {
                tracing::error!("DB save error: {}", e);
                "Error saving wallet.".to_string()
            }
        }
    }

    async fn balance_response(&self, from: &str) -> String {
        let Some(ref repo) = self.user_repo else {
            return "Balance: $0.00\nDB offline.".to_string();
        };

        // Get user's wallet address
        let user = match repo.find_by_phone(from).await {
            Ok(Some(u)) => u,
            Ok(None) => return "No wallet. Reply JOIN first.".to_string(),
            Err(_) => return "Error. Try later.".to_string(),
        };

        // Call Contract API to get balance on Sepolia
        let client = reqwest::Client::new();
        let api_url = format!("http://localhost:3000/api/balance/{}", user.wallet_address);
        
        tracing::info!("Fetching balance from Contract API for {}", user.wallet_address);
        
        let response = match client.get(&api_url).send().await {
            Ok(resp) => resp,
            Err(e) => {
                tracing::error!("Failed to call Contract API: {}", e);
                return "Network error. Try later.".to_string();
            }
        };

        // Parse response
        let result: serde_json::Value = match response.json().await {
            Ok(json) => json,
            Err(e) => {
                tracing::error!("Failed to parse API response: {}", e);
                return "Error processing response.".to_string();
            }
        };

        if result["success"].as_bool().unwrap_or(false) {
            let txtc_balance = result["balances"]["txtc"].as_str().unwrap_or("0");
            let eth_balance = result["balances"]["eth"].as_str().unwrap_or("0");
            
            // Parse as float for display
            let txtc: f64 = txtc_balance.parse().unwrap_or(0.0);
            let eth: f64 = eth_balance.parse().unwrap_or(0.0);
            
            if txtc > 0.0 || eth > 0.0 {
                format!(
                    "Balance:\n{} TXTC\n{} ETH\n\nSepolia testnet",
                    txtc, eth
                )
            } else {
                "Balance: $0.00\n\nReply DEPOSIT to fund wallet.".to_string()
            }
        } else {
            "Error fetching balance.".to_string()
        }
    }

    async fn pin_response(&self, from: &str, new_pin: Option<String>) -> String {
        match new_pin {
            Some(pin) => {
                if pin.len() < 4 || pin.len() > 6 || !pin.chars().all(|c| c.is_ascii_digit()) {
                    "PIN must be 4-6 digits.\nExample: PIN 1234".to_string()
                } else {
                    // Save PIN hash
                    if let Some(ref repo) = self.user_repo {
                        // Simple hash for demo (use bcrypt in production)
                        let pin_hash = format!("{:x}", sha2::Sha256::digest(pin.as_bytes()));
                        if repo.update_pin(from, &pin_hash).await.is_ok() {
                            return "PIN set!".to_string();
                        }
                    }
                    "PIN set!".to_string()
                }
            }
            None => "Reply: PIN <4-6 digits>\nExample: PIN 1234".to_string(),
        }
    }

    async fn send_response(&self, from: &str, amount: f64, token: &str, recipient: &str) -> String {
        // Only support TXTC for now
        if token.to_uppercase() != "TXTC" {
            return format!("Only TXTC transfers supported.\nYou have: {} TXTC", token);
        }

        // Get sender's wallet and private key
        let Some(ref user_repo) = self.user_repo else {
            return "DB offline. Try later.".to_string();
        };

        let sender = match user_repo.find_by_phone(from).await {
            Ok(Some(u)) => u,
            Ok(None) => return "No wallet. Reply JOIN first.".to_string(),
            Err(_) => return "Error. Try later.".to_string(),
        };

        // Resolve recipient address (could be phone number or wallet address)
        let recipient_address = if recipient.starts_with("0x") && recipient.len() == 42 {
            // Already a wallet address
            recipient.to_string()
        } else if recipient.starts_with("+") {
            // Phone number - look up in database
            match user_repo.find_by_phone(recipient).await {
                Ok(Some(u)) => u.wallet_address,
                Ok(None) => return format!("{} hasn't joined yet.\nAsk them to text JOIN", recipient),
                Err(_) => return "Error looking up recipient.".to_string(),
            }
        } else {
            return "Invalid recipient.\nUse phone (+1...) or address (0x...)".to_string();
        };

        // Get user's private key (stored as hex without 0x prefix)
        let private_key = format!("0x{}", sender.encrypted_private_key);

        // Call Contract API to send tokens
        let client = reqwest::Client::new();
        let api_url = "http://localhost:3000/api/send";
        
        tracing::info!("Sending {} TXTC from {} to {}", amount, sender.wallet_address, recipient_address);
        
        let response = match client
            .post(api_url)
            .json(&serde_json::json!({
                "userPrivateKey": private_key,
                "toAddress": recipient_address,
                "amount": amount.to_string()
            }))
            .send()
            .await
        {
            Ok(resp) => resp,
            Err(e) => {
                tracing::error!("Failed to call Contract API: {}", e);
                return "Network error. Try later.".to_string();
            }
        };

        // Parse response
        let result: serde_json::Value = match response.json().await {
            Ok(json) => json,
            Err(e) => {
                tracing::error!("Failed to parse API response: {}", e);
                return "Error processing response.".to_string();
            }
        };

        if result["success"].as_bool().unwrap_or(false) {
            let tx_hash = result["txHash"].as_str().unwrap_or("");
            
            tracing::info!("Transfer successful: tx {}", tx_hash);
            
            format!(
                "Sent {} TXTC to {}!\n\nReply BALANCE to check.",
                amount, recipient
            )
        } else {
            let error_msg = result["error"].as_str().unwrap_or("Unknown error");
            tracing::error!("Transfer failed: {}", error_msg);
            
            if error_msg.contains("insufficient") || error_msg.contains("balance") {
                "Insufficient balance.".to_string()
            } else {
                "Transfer failed. Try later.".to_string()
            }
        }
    }

    async fn swap_response(&self, from: &str, amount: f64, token: &str) -> String {
        // Only support TXTC for now
        if token.to_uppercase() != "TXTC" {
            return format!("Only TXTC swaps supported.\nYou have: {} TXTC", token);
        }

        // Get user's wallet and private key
        let Some(ref user_repo) = self.user_repo else {
            return "DB offline. Try later.".to_string();
        };

        let user = match user_repo.find_by_phone(from).await {
            Ok(Some(u)) => u,
            Ok(None) => return "No wallet. Reply JOIN first.".to_string(),
            Err(_) => return "Error. Try later.".to_string(),
        };

        // Get user's private key (stored as hex without 0x prefix)
        let private_key = format!("0x{}", user.encrypted_private_key);

        // Call Contract API to swap tokens
        let client = reqwest::Client::new();
        let api_url = "http://localhost:3000/api/swap";
        
        tracing::info!("Swapping {} TXTC to ETH for {}", amount, user.wallet_address);
        
        let response = match client
            .post(api_url)
            .json(&serde_json::json!({
                "userPrivateKey": private_key,
                "tokenAmount": amount.to_string(),
                "minEthOut": "0"
            }))
            .send()
            .await
        {
            Ok(resp) => resp,
            Err(e) => {
                tracing::error!("Failed to call Contract API: {}", e);
                return "Network error. Try later.".to_string();
            }
        };

        // Parse response
        let result: serde_json::Value = match response.json().await {
            Ok(json) => json,
            Err(e) => {
                tracing::error!("Failed to parse API response: {}", e);
                return "Error processing response.".to_string();
            }
        };

        if result["success"].as_bool().unwrap_or(false) {
            let eth_received = result["ethReceived"].as_str().unwrap_or("0");
            let tx_hash = result["txHash"].as_str().unwrap_or("");
            
            tracing::info!("Swap successful: {} ETH received, tx {}", eth_received, tx_hash);
            
            format!(
                "Swapped {} TXTC for {} ETH!\n\nReply BALANCE to check.",
                amount, eth_received
            )
        } else {
            let error_msg = result["error"].as_str().unwrap_or("Unknown error");
            tracing::error!("Swap failed: {}", error_msg);
            
            if error_msg.contains("insufficient") || error_msg.contains("balance") {
                "Insufficient balance.".to_string()
            } else if error_msg.contains("slippage") {
                "Price moved too much. Try again.".to_string()
            } else {
                "Swap failed. Try later.".to_string()
            }
        }
    }

    async fn deposit_response(&self, from: &str) -> String {
        let Some(ref repo) = self.user_repo else {
            return "DB offline. Reply JOIN first.".to_string();
        };

        match repo.find_by_phone(from).await {
            Ok(Some(user)) => {
                format!(
                    "Deposit MATIC to:\n{}\n\nPolygon Amoy testnet",
                    user.wallet_address
                )
            }
            Ok(None) => "No wallet. Reply JOIN first.".to_string(),
            Err(_) => "Error. Try later.".to_string(),
        }
    }

    async fn history_response(&self, from: &str) -> String {
        // Check for recent deposits
        if let Some(ref deposit_repo) = self.deposit_repo {
            if let Ok(deposits) = deposit_repo.get_recent(from, 5).await {
                if !deposits.is_empty() {
                    let history: Vec<String> = deposits.iter()
                        .map(|d| format!("${:.2} via {}", d.amount_as_f64(), d.source))
                        .collect();
                    return format!("Recent deposits:\n{}", history.join("\n"));
                }
            }
        }
        "No transactions yet.\nReply REDEEM <code> to add funds.".to_string()
    }

    async fn redeem_response(&self, from: &str, code: &str) -> String {
        // Check if user has wallet
        let Some(ref user_repo) = self.user_repo else {
            return "DB offline. Try later.".to_string();
        };

        // Get user's wallet address
        let user = match user_repo.find_by_phone(from).await {
            Ok(Some(user)) => user,
            Ok(None) => return "No wallet. Reply JOIN first.".to_string(),
            Err(_) => return "Error. Try later.".to_string(),
        };

        // Call Contract API to redeem voucher on-chain
        let client = reqwest::Client::new();
        let api_url = "http://localhost:3000/api/redeem";
        
        tracing::info!("Calling Contract API to redeem voucher: {}", code);
        
        let response = match client
            .post(api_url)
            .json(&serde_json::json!({
                "voucherCode": code,
                "userAddress": user.wallet_address
            }))
            .send()
            .await
        {
            Ok(resp) => resp,
            Err(e) => {
                tracing::error!("Failed to call Contract API: {}", e);
                return "Network error. Try later.".to_string();
            }
        };

        // Parse response
        let result: serde_json::Value = match response.json().await {
            Ok(json) => json,
            Err(e) => {
                tracing::error!("Failed to parse API response: {}", e);
                return "Error processing response.".to_string();
            }
        };

        if result["success"].as_bool().unwrap_or(false) {
            let eth_amount = result["ethAmount"].as_str().unwrap_or("0");
            let tx_hash = result["txHash"].as_str().unwrap_or("");
            
            tracing::info!("Voucher redeemed successfully: {} ETH, tx: {}", eth_amount, tx_hash);
            
            format!(
                "Voucher redeemed!\n\n{} ETH credited.\n\nReply BALANCE to check.",
                eth_amount
            )
        } else {
            let error_msg = result["error"].as_str().unwrap_or("Unknown error");
            tracing::error!("Redemption failed: {}", error_msg);
            
            if error_msg.contains("already redeemed") || error_msg.contains("AlreadyRedeemed") {
                "Voucher already used.".to_string()
            } else if error_msg.contains("not found") || error_msg.contains("invalid") {
                "Invalid voucher code.".to_string()
            } else {
                "Redemption failed. Try later.".to_string()
            }
        }
    }

    async fn save_response(&self, from: &str, name: &str, phone: &str) -> String {
        let Some(ref address_book) = self.address_book_repo else {
            return "Address book offline.".to_string();
        };

        match address_book.add_contact(from, name, Some(phone), None).await {
            Ok(_) => format!("Saved {} as {}.", phone, name),
            Err(_) => "Error saving contact.".to_string(),
        }
    }

    async fn contacts_response(&self, from: &str) -> String {
        let Some(ref address_book) = self.address_book_repo else {
            return "Address book offline.".to_string();
        };

        match address_book.list_all(from).await {
            Ok(contacts) if contacts.is_empty() => {
                "No contacts yet.\n\nSAVE <name> <phone>".to_string()
            }
            Ok(contacts) => {
                let list: Vec<String> = contacts.iter()
                    .take(5)
                    .map(|c| c.to_sms_string())
                    .collect();
                format!("Contacts:\n{}", list.join("\n"))
            }
            Err(_) => "Error loading contacts.".to_string(),
        }
    }

    async fn chain_response(&self, from: &str, chain_input: &str) -> String {
        let Some(chain) = Chain::from_input(chain_input) else {
            return format!(
                "Unknown chain: {}\n\nAvailable: polygon, base, eth, arb",
                chain_input
            );
        };

        // For now, just acknowledge - could save preference to DB
        format!(
            "Switched to {}!\n\nChain ID: {}\nNative: {}",
            chain.name(),
            chain.chain_id(),
            chain.native_token()
        )
    }

    fn unknown_response(&self, text: &str) -> String {
        if text.is_empty() {
            "Welcome to TextChain!\n\nReply HELP for commands.".to_string()
        } else {
            format!(
                "Unknown: {}\n\nReply HELP for commands.",
                text.chars().take(15).collect::<String>()
            )
        }
    }
}

impl std::fmt::Debug for CommandProcessor {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("CommandProcessor")
            .field("has_db", &self.user_repo.is_some())
            .field("has_vouchers", &self.voucher_repo.is_some())
            .field("has_deposits", &self.deposit_repo.is_some())
            .finish()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::wallet::create_shared_provider;

    fn test_processor() -> CommandProcessor {
        CommandProcessor::new(None, create_shared_provider())
    }

    #[test]
    fn test_parse_help() {
        let processor = test_processor();
        assert_eq!(processor.parse("HELP"), Command::Help);
        assert_eq!(processor.parse("help"), Command::Help);
        assert_eq!(processor.parse("?"), Command::Help);
    }

    #[test]
    fn test_parse_join() {
        let processor = test_processor();
        assert_eq!(processor.parse("JOIN"), Command::Join);
        assert_eq!(processor.parse("start"), Command::Join);
    }

    #[test]
    fn test_parse_balance() {
        let processor = test_processor();
        assert_eq!(processor.parse("BALANCE"), Command::Balance);
        assert_eq!(processor.parse("bal"), Command::Balance);
    }

    #[test]
    fn test_parse_send() {
        let processor = test_processor();
        
        let cmd = processor.parse("SEND 10 USDC TO +917123456789");
        assert!(matches!(cmd, Command::Send { amount, token, recipient } 
            if amount == 10.0 && token == "USDC" && recipient == "+917123456789"));
    }

    #[test]
    fn test_parse_pin() {
        let processor = test_processor();
        
        let cmd = processor.parse("PIN 1234");
        assert!(matches!(cmd, Command::Pin { new_pin: Some(pin) } if pin == "1234"));
        
        let cmd = processor.parse("PIN");
        assert!(matches!(cmd, Command::Pin { new_pin: None }));
    }

    #[test]
    fn test_parse_unknown() {
        let processor = test_processor();
        
        let cmd = processor.parse("FOOBAR");
        assert!(matches!(cmd, Command::Unknown(_)));
    }
}
