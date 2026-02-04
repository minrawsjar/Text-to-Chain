// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ENSRegistry
 * @dev Simple ENS-like registry for Text-to-Chain wallet naming
 * @notice Maps human-readable names to wallet addresses for SMS-based interactions
 */
contract ENSRegistry is Ownable {
    
    string public constant BASE_DOMAIN = ".textchain.eth";
    
    struct NameRecord {
        address owner;
        address resolver;
        uint256 registeredAt;
        uint256 expiresAt;
        bool isActive;
    }
    
    mapping(bytes32 => NameRecord) public records;
    mapping(address => string) public primaryNames;
    mapping(string => bool) public nameExists;
    
    uint256 public constant REGISTRATION_DURATION = 365 days;
    uint256 public registrationFee = 0.001 ether;
    
    event NameRegistered(string indexed name, address indexed owner, uint256 expiresAt);
    event NameRenewed(string indexed name, uint256 newExpiresAt);
    event NameTransferred(string indexed name, address indexed from, address indexed to);
    event PrimaryNameSet(address indexed owner, string name);
    event RegistrationFeeUpdated(uint256 newFee);
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev Register a new name
     * @param name Name to register (without .textchain.eth suffix)
     * @param owner Address to register the name to
     */
    function registerName(string memory name, address owner) external payable returns (bytes32) {
        require(bytes(name).length > 0, "ENSRegistry: empty name");
        require(bytes(name).length <= 32, "ENSRegistry: name too long");
        require(owner != address(0), "ENSRegistry: zero address");
        require(msg.value >= registrationFee, "ENSRegistry: insufficient fee");
        require(!nameExists[name], "ENSRegistry: name taken");
        
        bytes32 nameHash = keccak256(abi.encodePacked(name));
        
        records[nameHash] = NameRecord({
            owner: owner,
            resolver: owner,
            registeredAt: block.timestamp,
            expiresAt: block.timestamp + REGISTRATION_DURATION,
            isActive: true
        });
        
        nameExists[name] = true;
        
        if (bytes(primaryNames[owner]).length == 0) {
            primaryNames[owner] = name;
        }
        
        emit NameRegistered(name, owner, block.timestamp + REGISTRATION_DURATION);
        
        return nameHash;
    }
    
    /**
     * @dev Renew a name registration
     * @param name Name to renew
     */
    function renewName(string memory name) external payable {
        require(nameExists[name], "ENSRegistry: name not found");
        require(msg.value >= registrationFee, "ENSRegistry: insufficient fee");
        
        bytes32 nameHash = keccak256(abi.encodePacked(name));
        NameRecord storage record = records[nameHash];
        
        require(record.isActive, "ENSRegistry: name not active");
        require(msg.sender == record.owner, "ENSRegistry: not owner");
        
        record.expiresAt += REGISTRATION_DURATION;
        
        emit NameRenewed(name, record.expiresAt);
    }
    
    /**
     * @dev Transfer name ownership
     * @param name Name to transfer
     * @param newOwner New owner address
     */
    function transferName(string memory name, address newOwner) external {
        require(nameExists[name], "ENSRegistry: name not found");
        require(newOwner != address(0), "ENSRegistry: zero address");
        
        bytes32 nameHash = keccak256(abi.encodePacked(name));
        NameRecord storage record = records[nameHash];
        
        require(msg.sender == record.owner, "ENSRegistry: not owner");
        require(record.isActive, "ENSRegistry: name not active");
        require(block.timestamp < record.expiresAt, "ENSRegistry: name expired");
        
        address oldOwner = record.owner;
        record.owner = newOwner;
        record.resolver = newOwner;
        
        if (keccak256(abi.encodePacked(primaryNames[oldOwner])) == nameHash) {
            delete primaryNames[oldOwner];
        }
        
        if (bytes(primaryNames[newOwner]).length == 0) {
            primaryNames[newOwner] = name;
        }
        
        emit NameTransferred(name, oldOwner, newOwner);
    }
    
    /**
     * @dev Set primary name for an address
     * @param name Name to set as primary
     */
    function setPrimaryName(string memory name) external {
        require(nameExists[name], "ENSRegistry: name not found");
        
        bytes32 nameHash = keccak256(abi.encodePacked(name));
        NameRecord storage record = records[nameHash];
        
        require(record.owner == msg.sender, "ENSRegistry: not owner");
        require(record.isActive, "ENSRegistry: name not active");
        require(block.timestamp < record.expiresAt, "ENSRegistry: name expired");
        
        primaryNames[msg.sender] = name;
        
        emit PrimaryNameSet(msg.sender, name);
    }
    
    /**
     * @dev Resolve name to address
     * @param name Name to resolve
     */
    function resolve(string memory name) external view returns (address) {
        if (!nameExists[name]) return address(0);
        
        bytes32 nameHash = keccak256(abi.encodePacked(name));
        NameRecord storage record = records[nameHash];
        
        if (!record.isActive || block.timestamp >= record.expiresAt) {
            return address(0);
        }
        
        return record.resolver;
    }
    
    /**
     * @dev Reverse resolve address to primary name
     * @param addr Address to reverse resolve
     */
    function reverseResolve(address addr) external view returns (string memory) {
        return primaryNames[addr];
    }
    
    /**
     * @dev Get full name with domain
     * @param name Short name
     */
    function getFullName(string memory name) external pure returns (string memory) {
        return string(abi.encodePacked(name, BASE_DOMAIN));
    }
    
    /**
     * @dev Check if name is available
     * @param name Name to check
     */
    function isAvailable(string memory name) external view returns (bool) {
        if (!nameExists[name]) return true;
        
        bytes32 nameHash = keccak256(abi.encodePacked(name));
        NameRecord storage record = records[nameHash];
        
        return !record.isActive || block.timestamp >= record.expiresAt;
    }
    
    /**
     * @dev Get name record details
     * @param name Name to query
     */
    function getNameRecord(string memory name) external view returns (
        address owner,
        address resolver,
        uint256 registeredAt,
        uint256 expiresAt,
        bool isActive
    ) {
        require(nameExists[name], "ENSRegistry: name not found");
        
        bytes32 nameHash = keccak256(abi.encodePacked(name));
        NameRecord storage record = records[nameHash];
        
        return (
            record.owner,
            record.resolver,
            record.registeredAt,
            record.expiresAt,
            record.isActive
        );
    }
    
    /**
     * @dev Update registration fee (owner only)
     * @param newFee New registration fee
     */
    function updateRegistrationFee(uint256 newFee) external onlyOwner {
        registrationFee = newFee;
        emit RegistrationFeeUpdated(newFee);
    }
    
    /**
     * @dev Withdraw collected fees (owner only)
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "ENSRegistry: no balance");
        
        (bool success, ) = owner().call{value: balance}("");
        require(success, "ENSRegistry: transfer failed");
    }
}
