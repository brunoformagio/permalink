// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";

/**
 * @title Permalink - Generative Art NFT Platform
 * @dev Multi-edition NFT contract with artist profiles and on-chain image storage
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
    
    // Whitelist system
    bool public whitelistEnabled = true; // Flag to enable/disable whitelist
    mapping(address => bool) public interestedAddresses;
    mapping(address => bool) public whitelistedAddresses;
    mapping(address => bool) public adminAddresses;
    
    address[] public interestedAddressList;
    address[] public whitelistedAddressList;
    address[] public adminAddressList;
    
    // Artist Profile Structure
    struct ArtistProfile {
        string name;
        string bio;
        string avatarURI;
        uint256 totalCreated;
        uint256 totalCollected;
        bool isRegistered;
    }
    
    // Artwork Structure - Updated for efficient storage
    struct Artwork {
        uint256 tokenId;
        address artist;
        string title;
        string description;
        bytes imageData;        // Raw image bytes for on-chain storage
        string imageType;       // File extension: "jpeg", "png", "gif", "zip"
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
        uint256 maxSupply,
        uint256 imageSize
    );
    
    event ArtworkPurchased(
        uint256 indexed tokenId,
        address indexed buyer,
        address indexed artist,
        uint256 amount,
        uint256 price
    );
    
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
    
    // Whitelist events
    event AddressRegisteredInterest(address indexed addr);
    event AddressWhitelisted(address indexed addr);
    event AddressRemovedFromWhitelist(address indexed addr);
    event AdminAdded(address indexed admin, address indexed addedBy);
    event AdminRemoved(address indexed admin, address indexed removedBy);
    event WhitelistToggled(bool enabled, address indexed toggledBy);
    
    // Modifiers
    modifier onlyArtist(uint256 tokenId) {
        require(tokenToArtist[tokenId] == msg.sender, "Not the artist");
        _;
    }
    
    modifier validTokenId(uint256 tokenId) {
        require(tokenId <= _currentTokenId && tokenId > 0, "Invalid token ID");
        _;
    }
    
    modifier onlyAdmin() {
        require(adminAddresses[msg.sender] || msg.sender == owner(), "Not an admin");
        _;
    }
    
    modifier onlyWhitelisted() {
        if (whitelistEnabled) {
            require(whitelistedAddresses[msg.sender] || msg.sender == owner(), "Not whitelisted");
        }
        _;
    }
    
    constructor(address initialOwner) ERC1155("") Ownable(initialOwner) {
        // Set initial URI pattern (will be overridden by dynamic generation)
        _setURI("https://api.permalink.art/metadata/{id}.json");
        
        // Set initial owner as admin and whitelist them
        adminAddresses[initialOwner] = true;
        whitelistedAddresses[initialOwner] = true;
        adminAddressList.push(initialOwner);
        whitelistedAddressList.push(initialOwner);
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
     * @dev Mint new artwork with on-chain image storage
     */
    function mintArtwork(
        string memory _title,
        string memory _description,
        bytes memory _imageData,
        string memory _imageType,
        uint256 _price,
        uint256 _maxSupply
    ) external whenNotPaused nonReentrant onlyWhitelisted returns (uint256) {
        require(_maxSupply > 0, "Max supply must be greater than 0");
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(_imageData.length > 0, "Image data cannot be empty");
        require(_imageData.length <= 16 * 1024, "Image too large (16KB max)");
        require(bytes(_imageType).length > 0, "Image type cannot be empty");
        require(_isValidImageType(_imageType), "Invalid image type");
        
        _currentTokenId++;
        uint256 newTokenId = _currentTokenId;
        
        // Create artwork record with raw image data
        artworks[newTokenId] = Artwork({
            tokenId: newTokenId,
            artist: msg.sender,
            title: _title,
            description: _description,
            imageData: _imageData,
            imageType: _imageType,
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
        
        emit ArtworkMinted(newTokenId, msg.sender, _title, _price, _maxSupply, _imageData.length);
        
        return newTokenId;
    }
    
    /**
     * @dev Purchase artwork editions
     */
    function purchaseArtwork(
        uint256 tokenId,
        uint256 amount
    ) external payable whenNotPaused nonReentrant onlyWhitelisted validTokenId(tokenId) {
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
        string memory imageType,
        uint256 imageSize,
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
            artwork.imageType,
            artwork.imageData.length,
            artwork.price,
            artwork.maxSupply,
            artwork.currentSupply,
            artwork.isActive,
            artwork.createdAt
        );
    }
    
    /**
     * @dev Get artwork image data (for direct access)
     */
    function getArtworkImageData(uint256 tokenId) external view validTokenId(tokenId) returns (
        bytes memory imageData,
        string memory imageType
    ) {
        Artwork memory artwork = artworks[tokenId];
        return (artwork.imageData, artwork.imageType);
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
    
    // ====== WHITELIST FUNCTIONS ======
    
    /**
     * @dev Register interest in joining the platform
     */
    function registerInterest() external {
        require(!interestedAddresses[msg.sender], "Already registered interest");
        require(!whitelistedAddresses[msg.sender], "Already whitelisted");
        
        interestedAddresses[msg.sender] = true;
        interestedAddressList.push(msg.sender);
        
        emit AddressRegisteredInterest(msg.sender);
    }
    
    /**
     * @dev Check if an address is whitelisted
     */
    function isWhitelisted(address addr) external view returns (bool) {
        return whitelistedAddresses[addr];
    }
    
    /**
     * @dev Check if an address is interested
     */
    function isInterested(address addr) external view returns (bool) {
        return interestedAddresses[addr];
    }
    
    /**
     * @dev Check if an address is admin
     */
    function isAdmin(address addr) external view returns (bool) {
        return adminAddresses[addr];
    }
    
    /**
     * @dev Get all interested addresses
     */
    function getInterestedAddresses() external view returns (address[] memory) {
        return interestedAddressList;
    }
    
    /**
     * @dev Get all whitelisted addresses
     */
    function getWhitelistedAddresses() external view returns (address[] memory) {
        return whitelistedAddressList;
    }
    
    /**
     * @dev Get all admin addresses
     */
    function getAdminAddresses() external view returns (address[] memory) {
        return adminAddressList;
    }
    
    /**
     * @dev Approve one or more addresses from interested to whitelisted (admin only)
     */
    function approveAddresses(address[] calldata addresses) external onlyAdmin {
        for (uint256 i = 0; i < addresses.length; i++) {
            address addr = addresses[i];
            require(interestedAddresses[addr], "Address not interested");
            require(!whitelistedAddresses[addr], "Address already whitelisted");
            
            whitelistedAddresses[addr] = true;
            whitelistedAddressList.push(addr);
            
            emit AddressWhitelisted(addr);
        }
    }
    
    /**
     * @dev Remove address from whitelist (admin only)
     */
    function removeFromWhitelist(address addr) external onlyAdmin {
        require(whitelistedAddresses[addr], "Address not whitelisted");
        require(addr != owner(), "Cannot remove owner from whitelist");
        
        whitelistedAddresses[addr] = false;
        
        // Remove from array
        for (uint256 i = 0; i < whitelistedAddressList.length; i++) {
            if (whitelistedAddressList[i] == addr) {
                whitelistedAddressList[i] = whitelistedAddressList[whitelistedAddressList.length - 1];
                whitelistedAddressList.pop();
                break;
            }
        }
        
        emit AddressRemovedFromWhitelist(addr);
    }
    
    /**
     * @dev Add address as admin (admin only)
     */
    function addAdmin(address addr) external onlyAdmin {
        require(!adminAddresses[addr], "Already an admin");
        require(addr != address(0), "Invalid address");
        
        adminAddresses[addr] = true;
        adminAddressList.push(addr);
        
        // Auto-whitelist new admin
        if (!whitelistedAddresses[addr]) {
            whitelistedAddresses[addr] = true;
            whitelistedAddressList.push(addr);
        }
        
        emit AdminAdded(addr, msg.sender);
    }
    
    /**
     * @dev Remove admin (admin only)
     */
    function removeAdmin(address addr) external onlyAdmin {
        require(adminAddresses[addr], "Not an admin");
        require(addr != owner(), "Cannot remove owner from admin");
        require(addr != msg.sender, "Cannot remove yourself from admin");
        
        adminAddresses[addr] = false;
        
        // Remove from array
        for (uint256 i = 0; i < adminAddressList.length; i++) {
            if (adminAddressList[i] == addr) {
                adminAddressList[i] = adminAddressList[adminAddressList.length - 1];
                adminAddressList.pop();
                break;
            }
        }
        
        emit AdminRemoved(addr, msg.sender);
    }
    
    /**
     * @dev Toggle whitelist functionality on/off (admin only)
     */
    function toggleWhitelist() external onlyAdmin {
        whitelistEnabled = !whitelistEnabled;
        emit WhitelistToggled(whitelistEnabled, msg.sender);
    }
    
    /**
     * @dev Get whitelist enabled status
     */
    function isWhitelistEnabled() external view returns (bool) {
        return whitelistEnabled;
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
     * @dev Override URI function to generate metadata dynamically
     * This creates OpenSea-compatible metadata on-demand from stored data
     */
    function uri(uint256 tokenId) public view virtual override returns (string memory) {
        // Check if token exists
        if (tokenId <= _currentTokenId && tokenId > 0) {
            Artwork memory artwork = artworks[tokenId];
            if (artwork.imageData.length > 0) {
                return _generateMetadata(tokenId);
            }
        }
        
        // Fall back to base URI if no artwork found
        return super.uri(tokenId);
    }
    
    /**
     * @dev Generate NFT metadata dynamically from stored artwork data
     */
    function _generateMetadata(uint256 tokenId) internal view returns (string memory) {
        Artwork memory artwork = artworks[tokenId];
        
        // Build base64 image data URI
        string memory imageDataURI = string(abi.encodePacked(
            "data:image/", artwork.imageType, ";base64,",
            _bytesToBase64(artwork.imageData)
        ));
        
        // Build compact metadata JSON
        string memory metadata = string(abi.encodePacked(
            '{"name":"', artwork.title, ' #', _toString(tokenId), '",',
            '"description":"', artwork.description, '",',
            '"image":"', imageDataURI, '",',
            '"attributes":[',
                '{"trait_type":"Token Standard","value":"ERC-1155"},',
                '{"trait_type":"Storage","value":"On-chain"},',
                '{"trait_type":"Max Supply","value":', _toString(artwork.maxSupply), '},',
                '{"trait_type":"Current Supply","value":', _toString(artwork.currentSupply), '},',
                '{"trait_type":"Price (Wei)","value":', _toString(artwork.price), '},',
                '{"trait_type":"File Size","value":', _toString(artwork.imageData.length), '},',
                '{"trait_type":"File Type","value":"', artwork.imageType, '"},',
                '{"trait_type":"Creator","value":"', _addressToString(artwork.artist), '"}',
            '],',
            '"properties":{"category":"image"}}' 
        ));
        
        return string(abi.encodePacked(
            "data:application/json;base64,",
            _stringToBase64(metadata)
        ));
    }
    
    /**
     * @dev Validate image type
     */
    function _isValidImageType(string memory imageType) internal pure returns (bool) {
        return (
            _compareStrings(imageType, "jpeg") ||
            _compareStrings(imageType, "jpg") ||
            _compareStrings(imageType, "png") ||
            _compareStrings(imageType, "gif") ||
            _compareStrings(imageType, "webp") ||
            _compareStrings(imageType, "svg") ||
            _compareStrings(imageType, "zip")
        );
    }
    
    /**
     * @dev Convert bytes to base64 string (simplified implementation)
     */
    function _bytesToBase64(bytes memory data) internal pure returns (string memory) {
        if (data.length == 0) return "";
        
        // Base64 encoding table
        bytes memory table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        
        // Calculate the length of encoded string
        uint256 encodedLen = 4 * ((data.length + 2) / 3);
        
        // Allocate the encoded string
        bytes memory result = new bytes(encodedLen);
        
        uint256 i = 0;
        uint256 j = 0;
        
        // Process input data in chunks of 3 bytes
        for (i = 0; i < data.length; i += 3) {
            uint256 a = uint256(uint8(data[i]));
            uint256 b = (i + 1 < data.length) ? uint256(uint8(data[i + 1])) : 0;
            uint256 c = (i + 2 < data.length) ? uint256(uint8(data[i + 2])) : 0;
            
            uint256 bitmap = (a << 16) | (b << 8) | c;
            
            result[j++] = table[(bitmap >> 18) & 63];
            result[j++] = table[(bitmap >> 12) & 63];
            result[j++] = table[(bitmap >> 6) & 63];
            result[j++] = table[bitmap & 63];
        }
        
        // Add padding
        if (data.length % 3 == 1) {
            result[encodedLen - 1] = "=";
            result[encodedLen - 2] = "=";
        } else if (data.length % 3 == 2) {
            result[encodedLen - 1] = "=";
        }
        
        return string(result);
    }
    
    /**
     * @dev Convert string to base64
     */
    function _stringToBase64(string memory input) internal pure returns (string memory) {
        bytes memory data = bytes(input);
        return _bytesToBase64(data);
    }
    
    /**
     * @dev Convert uint256 to string
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
    
    /**
     * @dev Convert address to string
     */
    function _addressToString(address addr) internal pure returns (string memory) {
        bytes32 value = bytes32(uint256(uint160(addr)));
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(42);
        str[0] = '0';
        str[1] = 'x';
        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2] = alphabet[uint8(value[i + 12] >> 4)];
            str[3 + i * 2] = alphabet[uint8(value[i + 12] & 0x0f)];
        }
        return string(str);
    }
    
    /**
     * @dev Compare two strings
     */
    function _compareStrings(string memory a, string memory b) internal pure returns (bool) {
        return keccak256(abi.encodePacked(a)) == keccak256(abi.encodePacked(b));
    }
    
    /**
     * @dev Check if contract supports interface
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
} 