# 🔗 Permalink: Decentralized fully-onchain generative art platform on Etherlink
> Made by Bruno Formagio and FromFriends™.
- Live Demo: https://permalinkart.vercel.app
- GitHub Repo: https://github.com/brunoformagio/permalink
- Demo Video: https://vimeo.com/1106774829

# Permalink: A Technical Deep Dive

## Abstract

Permalink is a decentralized platform for generative art where the artwork and its metadata are stored **fully on-chain**. This ensures true permanence and immutability, eliminating reliance on external storage providers like IPFS or Arweave. By leveraging the high throughput and low transaction costs of the Etherlink blockchain, Permalink provides a seamless and cost-effective experience for artists and collectors. This paper details the technical architecture of Permalink, from its smart contracts to its frontend, and explores the design decisions that enable a fully on-chain generative art platform.

---

## 1. Introduction

The promise of NFTs is to provide a permanent, verifiable record of ownership for digital assets. However, many NFT projects still rely on centralized or semi-decentralized storage solutions for the underlying asset, creating a single point of failure. If the storage provider goes offline, the NFT may no longer point to the original artwork.

Permalink solves this problem by storing all data—the artwork, the metadata, and the ownership record—directly on the Etherlink blockchain. This paper will explore the technical implementation of Permalink, a generative art platform that is not just "on-chain" but **fully on-chain**.

---

## 2. System Architecture

The Permalink platform is comprised of three main components:

-   **Frontend**: A Next.js application that provides the user interface for minting, viewing, and trading generative art.
-   **Smart Contracts**: A set of Solidity contracts deployed on the Etherlink blockchain that govern the logic of the platform.
-   **Etherlink Blockchain**: The underlying infrastructure that provides the security, decentralization, and low-cost transactions necessary for a fully on-chain application.

### 2.1. Dependencies

A comprehensive list of all project dependencies, including packages for both production and development, can be found in the [Dependencies file](./DEPENDENCIES.md).

---

## 3. Smart Contract Design

The core of the Permalink platform is its smart contract architecture. 

### 3.1. `Permalink.sol` - The NFT Contract

This is an `ERC-721` contract that serves as the foundation for our generative art NFTs. It includes several key features:

#### 3.1.1. The ERC-721 Standard
ERC-721 is a multi-token standard that allows a single smart contract to manage multiple token types. This means it can handle fungible tokens (like a currency), non-fungible tokens (like a unique piece of art), and semi-fungible tokens all within the same contract.

**Key Features of ERC-721:**

*   **Batch Operations**: It allows for the transfer of multiple token types in a single transaction, which significantly reduces gas costs and network congestion. For example, a user can send multiple different NFTs to another user in one transaction.
*   **Efficiency**: Instead of deploying a new contract for each new token type (as is common with ERC-20 or ERC-721), a single ERC-721 contract can represent an entire collection of different tokens.

**Why We Chose ERC-721 for Permalink:**

The primary reason for choosing ERC-721 is its efficiency in handling multiple editions of a single artwork. In generative art, it is common for an artist to release a piece in a limited edition (e.g., 100 copies).

With ERC-721, we can represent all 100 editions as a single token ID with a supply of 100. This is far more efficient than the traditional ERC-721 approach, which would require minting 100 separate tokens, each with its own unique token ID and associated transaction costs. This efficiency is critical for a platform built on the principle of low-cost, high-volume transactions, which Etherlink enables.

-   **Fully On-Chain Storage**: The `mintArtwork` function takes the artwork's title, description, and the raw `bytes` of the image or `.zip` file as arguments. This data is stored directly in the `Artwork` struct on the blockchain.
-   **Artist Profiles**: The contract includes a dedicated `ArtistProfile` struct, allowing artists to manage their on-chain identity.
-   **ERC-2981 Royalties**: The contract implements the `ERC-2981` standard for secondary sale royalties, ensuring artists are fairly compensated for their work.
-   **Whitelist and Admin Controls**: A robust system for managing access to the platform, with roles for administrators and whitelisted artists.
