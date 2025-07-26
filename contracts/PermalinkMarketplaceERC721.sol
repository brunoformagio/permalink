// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";

interface IPermalinkERC721 {
    function getSecondaryFees(uint256 tokenId, uint256 salePrice) 
        external 
        view 
        returns (
            address artist,
            uint256 artistRoyalty,
            uint256 platformFee,
            uint256 totalFees
        );
        
    function getIndividualArtwork(uint256 tokenId) 
        external 
        view 
        returns (
            uint256 seriesId,
            address artist,
            string memory title,
            string memory description,
            string memory imageType,
            uint256 imageSize,
            uint256 mintedAt
        );
}

/**
 * @title PermalinkMarketplace - Secondary Market for Permalink ERC-721 NFTs
 * @dev Handles listings, offers, and trading with automatic royalty distribution
 */
contract PermalinkMarketplace is ReentrancyGuard, Ownable, Pausable, ERC721Holder {
    
    // Platform fee for marketplace operations (basis points)
    uint256 public marketplaceFee = 100; // 1% marketplace fee
    uint256 public constant MAX_MARKETPLACE_FEE = 500; // 5% max
    
    // References to the main contracts
    IERC721 public immutable permalinkNFT;
    IPermalinkERC721 public immutable permalinkContract;
    address public immutable platformTreasury;
    
    // Listing structure (simplified for ERC-721)
    struct Listing {
        uint256 tokenId;
        uint256 price;
        address seller;
        uint256 listedAt;
        bool isActive;
    }
    
    // Offer structure
    struct Offer {
        uint256 tokenId;
        uint256 price;
        address buyer;
        uint256 expiresAt;
        bool isActive;
    }
    
    // Storage
    mapping(bytes32 => Listing) public listings;
    mapping(bytes32 => Offer) public offers;
    mapping(uint256 => bytes32[]) public tokenListings;
    mapping(uint256 => bytes32[]) public tokenOffers;
    mapping(address => bytes32[]) public userListings;
    mapping(address => bytes32[]) public userOffers;
    
    // Counters
    uint256 private _listingIdCounter;
    uint256 private _offerIdCounter;
    
    // Events
    event Listed(
        bytes32 indexed listingId,
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price
    );
    
    event Unlisted(bytes32 indexed listingId, address indexed seller);
    
    event OfferMade(
        bytes32 indexed offerId,
        uint256 indexed tokenId,
        address indexed buyer,
        uint256 price,
        uint256 expiresAt
    );
    
    event OfferCancelled(bytes32 indexed offerId, address indexed buyer);
    
    event Sale(
        bytes32 indexed listingId,
        uint256 indexed tokenId,
        address indexed seller,
        address buyer,
        uint256 price,
        uint256 artistRoyalty,
        uint256 platformRoyalty,
        uint256 marketplaceFee
    );
    
    event OfferAccepted(
        bytes32 indexed offerId,
        uint256 indexed tokenId,
        address indexed seller,
        address buyer,
        uint256 price
    );
    
    constructor(
        address _permalinkNFT,
        address _permalinkContract,
        address _platformTreasury,
        address initialOwner
    ) Ownable(initialOwner) {
        permalinkNFT = IERC721(_permalinkNFT);
        permalinkContract = IPermalinkERC721(_permalinkContract);
        platformTreasury = _platformTreasury;
    }
    
    /**
     * @dev Create a listing for an NFT
     */
    function createListing(
        uint256 tokenId,
        uint256 price
    ) external whenNotPaused nonReentrant returns (bytes32) {
        require(price > 0, "Price must be greater than 0");
        require(
            permalinkNFT.ownerOf(tokenId) == msg.sender,
            "You don't own this token"
        );
        require(
            permalinkNFT.isApprovedForAll(msg.sender, address(this)) ||
            permalinkNFT.getApproved(tokenId) == address(this),
            "Marketplace not approved"
        );
        
        _listingIdCounter++;
        bytes32 listingId = keccak256(abi.encodePacked(
            msg.sender,
            tokenId,
            price,
            block.timestamp,
            _listingIdCounter
        ));
        
        listings[listingId] = Listing({
            tokenId: tokenId,
            price: price,
            seller: msg.sender,
            listedAt: block.timestamp,
            isActive: true
        });
        
        tokenListings[tokenId].push(listingId);
        userListings[msg.sender].push(listingId);
        
        emit Listed(listingId, tokenId, msg.sender, price);
        
        return listingId;
    }
    
    /**
     * @dev Cancel a listing
     */
    function cancelListing(bytes32 listingId) external {
        Listing storage listing = listings[listingId];
        require(listing.isActive, "Listing not active");
        require(listing.seller == msg.sender, "Not the seller");
        
        listing.isActive = false;
        emit Unlisted(listingId, msg.sender);
    }
    
    /**
     * @dev Buy from a listing
     */
    function buyFromListing(
        bytes32 listingId
    ) external payable whenNotPaused nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.isActive, "Listing not active");
        require(listing.seller != msg.sender, "Cannot buy from yourself");
        require(
            permalinkNFT.ownerOf(listing.tokenId) == listing.seller,
            "Seller no longer owns token"
        );
        
        uint256 totalPrice = listing.price;
        require(msg.value >= totalPrice, "Insufficient payment");
        
        // Calculate all fees
        uint256 marketplaceFeeAmount = (totalPrice * marketplaceFee) / 10000;
        
        // Get royalty information from main contract
        (
            address artist,
            uint256 artistRoyalty,
            uint256 platformRoyalty,
            
        ) = permalinkContract.getSecondaryFees(listing.tokenId, totalPrice);
        
        uint256 sellerAmount = totalPrice - marketplaceFeeAmount - artistRoyalty - platformRoyalty;
        
        // Transfer NFT
        permalinkNFT.safeTransferFrom(
            listing.seller,
            msg.sender,
            listing.tokenId
        );
        
        // Deactivate listing
        listing.isActive = false;
        
        // Distribute payments
        if (sellerAmount > 0) {
            payable(listing.seller).transfer(sellerAmount);
        }
        if (artistRoyalty > 0) {
            payable(artist).transfer(artistRoyalty);
        }
        if (platformRoyalty > 0) {
            payable(platformTreasury).transfer(platformRoyalty);
        }
        if (marketplaceFeeAmount > 0) {
            payable(owner()).transfer(marketplaceFeeAmount);
        }
        
        // Refund excess
        if (msg.value > totalPrice) {
            payable(msg.sender).transfer(msg.value - totalPrice);
        }
        
        emit Sale(
            listingId,
            listing.tokenId,
            listing.seller,
            msg.sender,
            totalPrice,
            artistRoyalty,
            platformRoyalty,
            marketplaceFeeAmount
        );
    }
    
    /**
     * @dev Make an offer on a token
     */
    function makeOffer(
        uint256 tokenId,
        uint256 duration
    ) external payable whenNotPaused nonReentrant returns (bytes32) {
        require(msg.value > 0, "Offer must be greater than 0");
        require(duration > 0 && duration <= 30 days, "Invalid duration");
        require(permalinkNFT.ownerOf(tokenId) != msg.sender, "Cannot offer on own token");
        
        _offerIdCounter++;
        bytes32 offerId = keccak256(abi.encodePacked(
            msg.sender,
            tokenId,
            msg.value,
            block.timestamp,
            _offerIdCounter
        ));
        
        uint256 expiresAt = block.timestamp + duration;
        
        offers[offerId] = Offer({
            tokenId: tokenId,
            price: msg.value,
            buyer: msg.sender,
            expiresAt: expiresAt,
            isActive: true
        });
        
        tokenOffers[tokenId].push(offerId);
        userOffers[msg.sender].push(offerId);
        
        emit OfferMade(offerId, tokenId, msg.sender, msg.value, expiresAt);
        
        return offerId;
    }
    
    /**
     * @dev Accept an offer
     */
    function acceptOffer(bytes32 offerId) external whenNotPaused nonReentrant {
        Offer storage offer = offers[offerId];
        require(offer.isActive, "Offer not active");
        require(block.timestamp <= offer.expiresAt, "Offer expired");
        require(
            permalinkNFT.ownerOf(offer.tokenId) == msg.sender,
            "You don't own this token"
        );
        require(
            permalinkNFT.isApprovedForAll(msg.sender, address(this)) ||
            permalinkNFT.getApproved(offer.tokenId) == address(this),
            "Marketplace not approved"
        );
        
        uint256 totalPrice = offer.price;
        
        // Calculate fees (same as listing)
        uint256 marketplaceFeeAmount = (totalPrice * marketplaceFee) / 10000;
        
        (
            address artist,
            uint256 artistRoyalty,
            uint256 platformRoyalty,
            
        ) = permalinkContract.getSecondaryFees(offer.tokenId, totalPrice);
        
        uint256 sellerAmount = totalPrice - marketplaceFeeAmount - artistRoyalty - platformRoyalty;
        
        // Transfer NFT
        permalinkNFT.safeTransferFrom(
            msg.sender,
            offer.buyer,
            offer.tokenId
        );
        
        // Deactivate offer
        offer.isActive = false;
        
        // Distribute payments
        if (sellerAmount > 0) {
            payable(msg.sender).transfer(sellerAmount);
        }
        if (artistRoyalty > 0) {
            payable(artist).transfer(artistRoyalty);
        }
        if (platformRoyalty > 0) {
            payable(platformTreasury).transfer(platformRoyalty);
        }
        if (marketplaceFeeAmount > 0) {
            payable(owner()).transfer(marketplaceFeeAmount);
        }
        
        emit OfferAccepted(offerId, offer.tokenId, msg.sender, offer.buyer, totalPrice);
    }
    
    /**
     * @dev Cancel an offer
     */
    function cancelOffer(bytes32 offerId) external nonReentrant {
        Offer storage offer = offers[offerId];
        require(offer.isActive, "Offer not active");
        require(offer.buyer == msg.sender, "Not the buyer");
        
        offer.isActive = false;
        
        // Refund the offer amount
        payable(msg.sender).transfer(offer.price);
        
        emit OfferCancelled(offerId, msg.sender);
    }
    
    /**
     * @dev Get active listings for a token
     */
    function getTokenListings(uint256 tokenId) external view returns (bytes32[] memory) {
        return tokenListings[tokenId];
    }
    
    /**
     * @dev Get active offers for a token
     */
    function getTokenOffers(uint256 tokenId) external view returns (bytes32[] memory) {
        return tokenOffers[tokenId];
    }
    
    /**
     * @dev Get user's listings
     */
    function getUserListings(address user) external view returns (bytes32[] memory) {
        return userListings[user];
    }
    
    /**
     * @dev Get user's offers
     */
    function getUserOffers(address user) external view returns (bytes32[] memory) {
        return userOffers[user];
    }
    
    /**
     * @dev Get listing details
     */
    function getListing(bytes32 listingId) external view returns (
        uint256 tokenId,
        uint256 price,
        address seller,
        uint256 listedAt,
        bool isActive
    ) {
        Listing memory listing = listings[listingId];
        return (
            listing.tokenId,
            listing.price,
            listing.seller,
            listing.listedAt,
            listing.isActive
        );
    }
    
    /**
     * @dev Get offer details
     */
    function getOffer(bytes32 offerId) external view returns (
        uint256 tokenId,
        uint256 price,
        address buyer,
        uint256 expiresAt,
        bool isActive
    ) {
        Offer memory offer = offers[offerId];
        return (
            offer.tokenId,
            offer.price,
            offer.buyer,
            offer.expiresAt,
            offer.isActive
        );
    }
    
    /**
     * @dev Set marketplace fee (owner only)
     */
    function setMarketplaceFee(uint256 _fee) external onlyOwner {
        require(_fee <= MAX_MARKETPLACE_FEE, "Fee too high");
        marketplaceFee = _fee;
    }
    
    /**
     * @dev Emergency withdraw (owner only)
     */
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    /**
     * @dev Pause/unpause marketplace
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
} 