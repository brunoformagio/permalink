// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";

/**
 * @title Permalink - Generative Art NFT Platform
 * @dev Multi-edition NFT contract with artist profiles and marketplace functionality
 */
contract Permalink is ERC1155, ERC1155Supply, Ownable, ReentrancyGuard, Pausable {
    // Contract name and symbol
    string public name = "Permalink";
    string public symbol = "PLINK";
    
    // Platform fee (in basis points, 250 = 2.5%)
    uint256 public platformFeePercentage = 250;
    uint256 public constant MAX_PLATFORM_FEE = 1000; // 10% max
    
    // Royalty fee for artists (in basis points, 1000 = 10%)
    uint256 public constant ARTIST_ROYALTY_PERCENTAGE = 1000;
    
    // Token counter
    uint256 private _currentTokenId = 0;
    
    // Artist Profile Structure
    struct ArtistProfile {
        string name;
        string bio;
        string avatarURI;
        uint256 totalCreated;
        uint256 totalCollected;
        bool isRegistered;
    }
    
    // Artwork Structure
    struct Artwork {
        uint256 tokenId;
        address artist;
        string title;
        string description;
        string metadataURI;
        uint256 price;
        uint256 maxSupply;
        uint256 currentSupply;
        bool isActive;
        uint256 createdAt;
    }
    
    // Mappings
    mapping(address => ArtistProfile) public artistProfiles;
    mapping(uint256 => Artwork) public artworks;
    mapping(uint256 => address) public tokenToArtist;
    mapping(address => uint256[]) public artistTokens;
    mapping(address => uint256[]) public collectorTokens;
    
    // Events
    event ArtistProfileUpdated(
        address indexed artist,
        string name,
        string bio,
        string avatarURI
    );
    
    event ArtworkMinted(
        uint256 indexed tokenId,
        address indexed artist,
        string title,
        uint256 price,
        uint256 maxSupply
    );
    
    event ArtworkPurchased(
        uint256 indexed tokenId,
        address indexed buyer,
        address indexed artist,
        uint256 amount,
        uint256 price
    );
    
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
    
    // Modifiers
    modifier onlyArtist(uint256 tokenId) {
        require(tokenToArtist[tokenId] == msg.sender, "Not the artist");
        _;
    }
    
    modifier validTokenId(uint256 tokenId) {
        require(tokenId <= _currentTokenId && tokenId > 0, "Invalid token ID");
        _;
    }
    
    constructor(address initialOwner) ERC1155("") Ownable(initialOwner) {
        // Set initial URI pattern
        _setURI("https://api.permalink.art/metadata/{id}.json");
    }
    
    /**
     * @dev Register or update artist profile
     */
    function updateArtistProfile(
        string memory _name,
        string memory _bio,
        string memory _avatarURI
    ) external {
        ArtistProfile storage profile = artistProfiles[msg.sender];
        
        if (!profile.isRegistered) {
            profile.isRegistered = true;
            profile.totalCreated = 0;
            profile.totalCollected = 0;
        }
        
        profile.name = _name;
        profile.bio = _bio;
        profile.avatarURI = _avatarURI;
        
        emit ArtistProfileUpdated(msg.sender, _name, _bio, _avatarURI);
    }
    
    /**
     * @dev Mint new artwork with multiple editions
     */
    function mintArtwork(
        string memory _title,
        string memory _description,
        string memory _metadataURI,
        uint256 _price,
        uint256 _maxSupply
    ) external whenNotPaused nonReentrant returns (uint256) {
        require(_maxSupply > 0, "Max supply must be greater than 0");
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_metadataURI).length > 0, "Metadata URI cannot be empty");
        
        _currentTokenId++;
        uint256 newTokenId = _currentTokenId;
        
        // Create artwork record
        artworks[newTokenId] = Artwork({
            tokenId: newTokenId,
            artist: msg.sender,
            title: _title,
            description: _description,
            metadataURI: _metadataURI,
            price: _price,
            maxSupply: _maxSupply,
            currentSupply: 0,
            isActive: true,
            createdAt: block.timestamp
        });
        
        // Update mappings
        tokenToArtist[newTokenId] = msg.sender;
        artistTokens[msg.sender].push(newTokenId);
        
        // Update artist profile
        ArtistProfile storage profile = artistProfiles[msg.sender];
        if (!profile.isRegistered) {
            profile.isRegistered = true;
            profile.totalCollected = 0;
        }
        profile.totalCreated++;
        
        emit ArtworkMinted(newTokenId, msg.sender, _title, _price, _maxSupply);
        
        return newTokenId;
    }
    
    /**
     * @dev Purchase artwork editions
     */
    function purchaseArtwork(
        uint256 tokenId,
        uint256 amount
    ) external payable whenNotPaused nonReentrant validTokenId(tokenId) {
        Artwork storage artwork = artworks[tokenId];
        require(artwork.isActive, "Artwork is not active");
        require(amount > 0, "Amount must be greater than 0");
        require(
            artwork.currentSupply + amount <= artwork.maxSupply,
            "Exceeds max supply"
        );
        
        uint256 totalPrice = artwork.price * amount;
        require(msg.value >= totalPrice, "Insufficient payment");
        
        // Calculate fees
        uint256 platformFee = (totalPrice * platformFeePercentage) / 10000;
        uint256 artistRoyalty = (totalPrice * ARTIST_ROYALTY_PERCENTAGE) / 10000;
        uint256 artistPayment = totalPrice - platformFee - artistRoyalty;
        
        // Mint tokens to buyer
        _mint(msg.sender, tokenId, amount, "");
        artwork.currentSupply += amount;
        
        // Update collector profile
        ArtistProfile storage buyerProfile = artistProfiles[msg.sender];
        if (!buyerProfile.isRegistered) {
            buyerProfile.isRegistered = true;
            buyerProfile.totalCreated = 0;
            buyerProfile.totalCollected = 0;
        }
        buyerProfile.totalCollected += amount;
        
        // Track collector tokens
        bool alreadyOwns = false;
        for (uint256 i = 0; i < collectorTokens[msg.sender].length; i++) {
            if (collectorTokens[msg.sender][i] == tokenId) {
                alreadyOwns = true;
                break;
            }
        }
        if (!alreadyOwns) {
            collectorTokens[msg.sender].push(tokenId);
        }
        
        // Transfer payments
        if (artistPayment > 0) {
            payable(artwork.artist).transfer(artistPayment);
        }
        
        // Refund excess payment
        if (msg.value > totalPrice) {
            payable(msg.sender).transfer(msg.value - totalPrice);
        }
        
        emit ArtworkPurchased(tokenId, msg.sender, artwork.artist, amount, artwork.price);
    }
    
    /**
     * @dev Get artist profile information
     */
    function getArtistProfile(address artist) external view returns (
        string memory artistName,
        string memory bio,
        string memory avatarURI,
        uint256 totalCreated,
        uint256 totalCollected,
        bool isRegistered
    ) {
        ArtistProfile memory profile = artistProfiles[artist];
        return (
            profile.name,
            profile.bio,
            profile.avatarURI,
            profile.totalCreated,
            profile.totalCollected,
            profile.isRegistered
        );
    }
    
    /**
     * @dev Get artwork details
     */
    function getArtwork(uint256 tokenId) external view validTokenId(tokenId) returns (
        address artist,
        string memory title,
        string memory description,
        string memory metadataURI,
        uint256 price,
        uint256 maxSupply,
        uint256 currentSupply,
        bool isActive,
        uint256 createdAt
    ) {
        Artwork memory artwork = artworks[tokenId];
        return (
            artwork.artist,
            artwork.title,
            artwork.description,
            artwork.metadataURI,
            artwork.price,
            artwork.maxSupply,
            artwork.currentSupply,
            artwork.isActive,
            artwork.createdAt
        );
    }
    
    /**
     * @dev Get tokens created by an artist
     */
    function getArtistTokens(address artist) external view returns (uint256[] memory) {
        return artistTokens[artist];
    }
    
    /**
     * @dev Get tokens collected by a user
     */
    function getCollectorTokens(address collector) external view returns (uint256[] memory) {
        return collectorTokens[collector];
    }
    
    /**
     * @dev Toggle artwork active status (artist only)
     */
    function toggleArtworkStatus(uint256 tokenId) external onlyArtist(tokenId) {
        artworks[tokenId].isActive = !artworks[tokenId].isActive;
    }
    
    /**
     * @dev Update artwork price (artist only)
     */
    function updateArtworkPrice(uint256 tokenId, uint256 newPrice) external onlyArtist(tokenId) {
        artworks[tokenId].price = newPrice;
    }
    
    /**
     * @dev Set platform fee (owner only)
     */
    function setPlatformFee(uint256 _platformFeePercentage) external onlyOwner {
        require(_platformFeePercentage <= MAX_PLATFORM_FEE, "Fee too high");
        uint256 oldFee = platformFeePercentage;
        platformFeePercentage = _platformFeePercentage;
        emit PlatformFeeUpdated(oldFee, _platformFeePercentage);
    }
    
    /**
     * @dev Withdraw platform fees (owner only)
     */
    function withdrawPlatformFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        payable(owner()).transfer(balance);
    }
    
    /**
     * @dev Pause/unpause contract (owner only)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Set base URI for metadata (owner only)
     */
    function setURI(string memory newURI) external onlyOwner {
        _setURI(newURI);
    }
    
    /**
     * @dev Get current token ID
     */
    function getCurrentTokenId() external view returns (uint256) {
        return _currentTokenId;
    }
    
    /**
     * @dev Override required by Solidity for multiple inheritance
     */
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override(ERC1155, ERC1155Supply) {
        super._update(from, to, ids, values);
    }
    
    /**
     * @dev Check if contract supports interface
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
} 