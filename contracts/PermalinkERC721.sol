// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";

/**
 * @title Permalink - Generative Art NFT Platform (ERC-721)
 * @dev ERC-721 NFT contract with artist profiles, series, and lazy minting
 * @dev Implements ERC-2981 for royalty standard compliance
 */
contract Permalink is ERC721, ERC721Enumerable, Ownable, ReentrancyGuard, Pausable, IERC2981 {
    
    // Platform fee (in basis points, 250 = 2.5%)
    uint256 public platformFeePercentage = 250;
    uint256 public constant MAX_PLATFORM_FEE = 1000; // 10% max
    
    // Secondary market royalties (basis points)
    uint256 public secondaryPlatformFee = 250; // 2.5% for platform on secondary sales
    uint256 public secondaryArtistRoyalty = 750; // 7.5% for artist on secondary sales
    
    // Treasury address for platform fees
    address public treasuryAddress;
    
    // Counters
    uint256 private _currentTokenId = 0;
    uint256 private _currentSeriesId = 0;
    
    // Whitelist system
    bool public whitelistEnabled = true;
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
        uint256 totalSeriesCreated;
        uint256 totalNFTsCollected;
        bool isRegistered;
    }
    
    // Artwork Series Structure - Template for lazy minting
    struct ArtworkSeries {
        uint256 seriesId;
        address artist;
        string title;
        string description;
        bytes imageData;        // Raw image bytes for on-chain storage
        string imageType;       // File extension: "jpeg", "png", "gif", "zip"
        uint256 price;
        uint256 maxSupply;
        uint256 minted;         // How many have been minted so far
        bool isActive;
        uint256 createdAt;
    }
    
    // Individual NFT Structure - Minted from series
    struct IndividualArtwork {
        uint256 tokenId;
        uint256 seriesId;
        address artist;
        uint256 mintedAt;
    }
    
    // Mappings
    mapping(address => ArtistProfile) public artistProfiles;
    mapping(uint256 => ArtworkSeries) public artworkSeries;
    mapping(uint256 => IndividualArtwork) public individualArtworks;
    mapping(uint256 => uint256[]) public seriesTokens; // seriesId => tokenIds[]
    mapping(address => uint256[]) public artistSeries;
    mapping(address => uint256[]) public collectorTokens;
    
    // Events
    event ArtistProfileUpdated(
        address indexed artist,
        string name,
        string bio,
        string avatarURI
    );
    
    event ArtworkSeriesCreated(
        uint256 indexed seriesId,
        address indexed artist,
        string title,
        uint256 price,
        uint256 maxSupply,
        uint256 imageSize
    );
    
    event ArtworkMinted(
        uint256 indexed tokenId,
        uint256 indexed seriesId,
        address indexed buyer,
        address artist,
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
    modifier onlySeriesArtist(uint256 seriesId) {
        require(artworkSeries[seriesId].artist == msg.sender, "Not the series artist");
        _;
    }
    
    modifier validSeriesId(uint256 seriesId) {
        require(seriesId <= _currentSeriesId && seriesId > 0, "Invalid series ID");
        _;
    }
    
    modifier validTokenId(uint256 tokenId) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
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
    
    constructor(address initialOwner, address _treasuryAddress) 
        ERC721("Permalink", "PLINK") 
        Ownable(initialOwner) 
    {
        require(_treasuryAddress != address(0), "Treasury address cannot be zero");
        
        // Set treasury address
        treasuryAddress = _treasuryAddress;
        
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
            profile.totalSeriesCreated = 0;
            profile.totalNFTsCollected = 0;
        }
        
        profile.name = _name;
        profile.bio = _bio;
        profile.avatarURI = _avatarURI;
        
        emit ArtistProfileUpdated(msg.sender, _name, _bio, _avatarURI);
    }
    
    /**
     * @dev Create new artwork series template (lazy minting)
     */
    function createArtworkSeries(
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
        
        _currentSeriesId++;
        uint256 newSeriesId = _currentSeriesId;
        
        // Create artwork series template
        artworkSeries[newSeriesId] = ArtworkSeries({
            seriesId: newSeriesId,
            artist: msg.sender,
            title: _title,
            description: _description,
            imageData: _imageData,
            imageType: _imageType,
            price: _price,
            maxSupply: _maxSupply,
            minted: 0,
            isActive: true,
            createdAt: block.timestamp
        });
        
        // Update mappings
        artistSeries[msg.sender].push(newSeriesId);
        
        // Update artist profile
        ArtistProfile storage profile = artistProfiles[msg.sender];
        if (!profile.isRegistered) {
            profile.isRegistered = true;
            profile.totalNFTsCollected = 0;
        }
        profile.totalSeriesCreated++;
        
        emit ArtworkSeriesCreated(newSeriesId, msg.sender, _title, _price, _maxSupply, _imageData.length);
        
        return newSeriesId;
    }
    
    /**
     * @dev Purchase and mint NFT from series (lazy minting)
     */
    function purchaseFromSeries(
        uint256 seriesId
    ) external payable whenNotPaused nonReentrant onlyWhitelisted validSeriesId(seriesId) returns (uint256) {
        ArtworkSeries storage series = artworkSeries[seriesId];
        require(series.isActive, "Series is not active");
        require(series.minted < series.maxSupply, "Series sold out");
        
        uint256 totalPrice = series.price;
        require(msg.value >= totalPrice, "Insufficient payment");
        
        // Calculate fees (Primary market - no royalties, only platform fee)
        uint256 platformFee = (totalPrice * platformFeePercentage) / 10000;
        uint256 artistPayment = totalPrice - platformFee;
        
        // Generate new unique token ID
        _currentTokenId++;
        uint256 newTokenId = _currentTokenId;
        
        // Mint ERC-721 token to buyer
        _mint(msg.sender, newTokenId);
        
        // Store individual artwork data
        individualArtworks[newTokenId] = IndividualArtwork({
            tokenId: newTokenId,
            seriesId: seriesId,
            artist: series.artist,
            mintedAt: block.timestamp
        });
        
        // Update series and mappings
        series.minted++;
        seriesTokens[seriesId].push(newTokenId);
        collectorTokens[msg.sender].push(newTokenId);
        
        // Update collector profile
        ArtistProfile storage buyerProfile = artistProfiles[msg.sender];
        if (!buyerProfile.isRegistered) {
            buyerProfile.isRegistered = true;
            buyerProfile.totalSeriesCreated = 0;
            buyerProfile.totalNFTsCollected = 0;
        }
        buyerProfile.totalNFTsCollected++;
        
        // Transfer payments
        if (artistPayment > 0) {
            payable(series.artist).transfer(artistPayment);
        }
        if (platformFee > 0) {
            payable(treasuryAddress).transfer(platformFee);
        }
        
        // Refund excess payment
        if (msg.value > totalPrice) {
            payable(msg.sender).transfer(msg.value - totalPrice);
        }
        
        emit ArtworkMinted(newTokenId, seriesId, msg.sender, series.artist, series.price);
        
        return newTokenId;
    }
    
    /**
     * @dev Get artist profile information
     */
    function getArtistProfile(address artist) external view returns (
        string memory artistName,
        string memory bio,
        string memory avatarURI,
        uint256 totalSeriesCreated,
        uint256 totalNFTsCollected,
        bool isRegistered
    ) {
        ArtistProfile memory profile = artistProfiles[artist];
        return (
            profile.name,
            profile.bio,
            profile.avatarURI,
            profile.totalSeriesCreated,
            profile.totalNFTsCollected,
            profile.isRegistered
        );
    }
    
    /**
     * @dev Get artwork series details
     */
    function getArtworkSeries(uint256 seriesId) external view validSeriesId(seriesId) returns (
        address artist,
        string memory title,
        string memory description,
        string memory imageType,
        uint256 imageSize,
        uint256 price,
        uint256 maxSupply,
        uint256 minted,
        bool isActive,
        uint256 createdAt
    ) {
        ArtworkSeries memory series = artworkSeries[seriesId];
        return (
            series.artist,
            series.title,
            series.description,
            series.imageType,
            series.imageData.length,
            series.price,
            series.maxSupply,
            series.minted,
            series.isActive,
            series.createdAt
        );
    }
    
    /**
     * @dev Get individual artwork details
     */
    function getIndividualArtwork(uint256 tokenId) external view validTokenId(tokenId) returns (
        uint256 seriesId,
        address artist,
        string memory title,
        string memory description,
        string memory imageType,
        uint256 imageSize,
        uint256 mintedAt
    ) {
        IndividualArtwork memory artwork = individualArtworks[tokenId];
        ArtworkSeries memory series = artworkSeries[artwork.seriesId];
        return (
            artwork.seriesId,
            artwork.artist,
            series.title,
            series.description,
            series.imageType,
            series.imageData.length,
            artwork.mintedAt
        );
    }
    
    /**
     * @dev Get artwork image data from series (for generative art)
     */
    function getArtworkImageData(uint256 tokenId) external view validTokenId(tokenId) returns (
        bytes memory imageData,
        string memory imageType
    ) {
        IndividualArtwork memory artwork = individualArtworks[tokenId];
        ArtworkSeries memory series = artworkSeries[artwork.seriesId];
        return (series.imageData, series.imageType);
    }
    
    /**
     * @dev Get all token IDs from a series
     */
    function getSeriesTokens(uint256 seriesId) external view validSeriesId(seriesId) returns (uint256[] memory) {
        return seriesTokens[seriesId];
    }
    
    /**
     * @dev Get series created by an artist
     */
    function getArtistSeries(address artist) external view returns (uint256[] memory) {
        return artistSeries[artist];
    }
    
    /**
     * @dev Get tokens collected by a user
     */
    function getCollectorTokens(address collector) external view returns (uint256[] memory) {
        return collectorTokens[collector];
    }
    
    /**
     * @dev Get current series ID
     */
    function getCurrentSeriesId() external view returns (uint256) {
        return _currentSeriesId;
    }
    
    /**
     * @dev Get current token ID
     */
    function getCurrentTokenId() external view returns (uint256) {
        return _currentTokenId;
    }
    
    // ====== WHITELIST FUNCTIONS (Same as before) ======
    
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
     * @dev Approve addresses from interested to whitelisted (admin only)
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
     * @dev Toggle series active status (artist only)
     */
    function toggleSeriesStatus(uint256 seriesId) external onlySeriesArtist(seriesId) {
        artworkSeries[seriesId].isActive = !artworkSeries[seriesId].isActive;
    }
    
    /**
     * @dev Update series price (artist only)
     */
    function updateSeriesPrice(uint256 seriesId, uint256 newPrice) external onlySeriesArtist(seriesId) {
        artworkSeries[seriesId].price = newPrice;
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
     * @dev Update treasury address (owner only)
     */
    function setTreasuryAddress(address _treasuryAddress) external onlyOwner {
        require(_treasuryAddress != address(0), "Treasury address cannot be zero");
        treasuryAddress = _treasuryAddress;
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
     * @dev Override URI function to generate metadata dynamically
     */
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        
        IndividualArtwork memory artwork = individualArtworks[tokenId];
        ArtworkSeries memory series = artworkSeries[artwork.seriesId];
        
        if (series.imageData.length > 0) {
            return _generateMetadata(tokenId, series);
        }
        
        return super.tokenURI(tokenId);
    }
    
    /**
     * @dev Generate NFT metadata dynamically from stored series data
     */
    function _generateMetadata(uint256 tokenId, ArtworkSeries memory series) internal pure returns (string memory) {
        // Build base64 image data URI
        string memory imageDataURI = string(abi.encodePacked(
            "data:image/", series.imageType, ";base64,",
            _bytesToBase64(series.imageData)
        ));
        
        // Build metadata JSON with unique token information
        string memory metadata = string(abi.encodePacked(
            '{"name":"', series.title, ' #', _toString(tokenId), '",',
            '"description":"', series.description, '",',
            '"image":"', imageDataURI, '",',
            '"attributes":[',
                '{"trait_type":"Token Standard","value":"ERC-721"},',
                '{"trait_type":"Storage","value":"On-chain"},',
                '{"trait_type":"Series ID","value":', _toString(series.seriesId), '},',
                '{"trait_type":"Edition","value":', _toString(tokenId), '},',
                '{"trait_type":"Max Supply","value":', _toString(series.maxSupply), '},',
                '{"trait_type":"Price (Wei)","value":', _toString(series.price), '},',
                '{"trait_type":"File Size","value":', _toString(series.imageData.length), '},',
                '{"trait_type":"File Type","value":"', series.imageType, '"},',
                '{"trait_type":"Creator","value":"', _addressToString(series.artist), '"}',
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
     * @dev Override required by Solidity for multiple inheritance
     */
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    /**
     * @dev Override required by Solidity for multiple inheritance
     */
    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    /**
     * @dev Override required by Solidity for multiple inheritance
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, IERC165)
        returns (bool)
    {
        return interfaceId == type(IERC2981).interfaceId || super.supportsInterface(interfaceId);
    }
    
    /**
     * @dev ERC-2981 royalty info for secondary markets
     */
    function royaltyInfo(uint256 tokenId, uint256 salePrice) 
        external 
        view 
        override 
        returns (address receiver, uint256 royaltyAmount) 
    {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        
        IndividualArtwork memory artwork = individualArtworks[tokenId];
        ArtworkSeries memory series = artworkSeries[artwork.seriesId];
        uint256 totalRoyalty = secondaryPlatformFee + secondaryArtistRoyalty;
        uint256 totalRoyaltyAmount = (salePrice * totalRoyalty) / 10000;
        
        return (series.artist, totalRoyaltyAmount);
    }
    
    /**
     * @dev Get secondary market fee breakdown for a token
     */
    function getSecondaryFees(uint256 tokenId, uint256 salePrice) 
        external 
        view 
        returns (
            address artist,
            uint256 artistRoyalty,
            uint256 platformFee,
            uint256 totalFees
        ) 
    {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        
        IndividualArtwork memory artwork = individualArtworks[tokenId];
        ArtworkSeries memory series = artworkSeries[artwork.seriesId];
        artist = series.artist;
        artistRoyalty = (salePrice * secondaryArtistRoyalty) / 10000;
        platformFee = (salePrice * secondaryPlatformFee) / 10000;
        totalFees = artistRoyalty + platformFee;
    }
    
    /**
     * @dev Update secondary market fees (owner only)
     */
    function setSecondaryFees(uint256 _platformFee, uint256 _artistRoyalty) external onlyOwner {
        require(_platformFee + _artistRoyalty <= 2000, "Total fees cannot exceed 20%");
        secondaryPlatformFee = _platformFee;
        secondaryArtistRoyalty = _artistRoyalty;
    }
    
    // ====== UTILITY FUNCTIONS (Same as before) ======
    
    /**
     * @dev Convert bytes to base64 string
     */
    function _bytesToBase64(bytes memory data) internal pure returns (string memory) {
        if (data.length == 0) return "";
        
        bytes memory table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        uint256 encodedLen = 4 * ((data.length + 2) / 3);
        bytes memory result = new bytes(encodedLen);
        
        uint256 i = 0;
        uint256 j = 0;
        
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
} 