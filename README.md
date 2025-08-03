# Permalink: Decentralized fully-onchain generative art platform on Etherlink
> Made by Bruno Formagio and FromFriends™.
- Live Demo: https://permalinkart.vercel.app
- GitHub Repo: https://github.com/brunoformagio/permalink
- Demo Video: https://vimeo.com/1106774829

---

## 📋 Submission for the Etherlink Hackathon

This project is a submission for the Etherlink Hackathon. We've leveraged Etherlink's technology to build a fully on-chain generative art platform.

## ✨ What is Permalink?

Permalink is a platform where digital artists can mint their generative art as NFTs and sell them to collectors. The key idea is to ensure the art and its ownership are **permanently** and **immutably** stored.

Artists upload their generative art code (e.g., p5.js sketches as a `.zip` file) which is stored **fully on-chain** within the NFT's data on the Etherlink blockchain. This ensures the art can never be lost, altered, or rely on external storage providers.

---

### 🔗 Etherlink Integration: Where Etherlink's tech is used

Etherlink is the backbone of Permalink. Here's how we're using it:

- **Smart Contracts Deployment**: All our smart contracts (ERC1155 for art, and the platform contract) are deployed and running on the **Etherlink Testnet**. This provides a scalable and fast environment for our application.
- **Fully On-Chain Data**: We store all metadata and the generative art content itself **fully on-chain**. This includes all artworks, artist information, and royalty details. Etherlink's low transaction fees and large block sizes make this true permanence possible.
- **Fast & Cheap Transactions**: The platform allows users to buy and sell art with very low gas fees and fast transaction confirmation times, thanks to Etherlink's architecture.

#### Connecting And Manage Wallet With Thirdweb
Thanks to Etherlink's full EVM compatibility, connecting to Permalink is a seamless experience. Users can connect with their favorite Ethereum wallets, such as MetaMask, with no extra setup required beyond adding the Etherlink network.

We also support in-app wallets, allowing users to create a wallet with their Google account for an even simpler onboarding process. This is all handled by the `ConnectButton` component from `thirdweb/react`, as seen in our `components/toolbar.tsx` file.

Our deployed contract addresses on Etherlink Testnet can be found in the `permalink-main/deployments` directory.

### Technical Paper

[Link to our Technical Paper](./TECHNICAL_PAPER.md)

This document provides a detailed explanation of the technical aspects of Permalink, including our smart contract architecture and frontend design.

---

## 🚀 How We Built It

### Tech Stack

![Etherlink](https://img.shields.io/badge/Etherlink-FF5722?style=for-the-badge&logo=tezos&logoColor=white)
![Next.js](https://img.shields.io/badge/next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Solidity](https://img.shields.io/badge/Solidity-363636?style=for-the-badge&logo=solidity&logoColor=white)
![Hardhat](https://img.shields.io/badge/Hardhat-D6E52E?style=for-the-badge&logo=hardhat&logoColor=black)

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Blockchain**: Solidity for smart contracts, deployed on Etherlink.
- **Development Environment**: Hardhat for Ethereum development, contract testing, and deployment.

### Smart Contracts

Our smart contract architecture is at the core of Permalink.

-   **`Permalink.sol`**: An `ERC-721` contract that handles the minting of generative art NFTs. It stores all artwork metadata and the artwork data itself directly on the blockchain. This contract also manages artist profiles and royalty information, complying with the `ERC-2981` standard.

### Features

-   **Fully On-Chain Storage**: All artwork metadata and the artwork data itself are stored **fully on-chain** on the Etherlink blockchain, ensuring it is as permanent as the NFT itself.
-   **Generative Art Support**: Artists can upload their generative art projects (e.g., in a `.zip` file) and mint them as interactive NFTs.
-   **Artist Profiles**: Artists can create and manage their own profiles, showcasing their work and building a following.
-   **Low-Cost Transactions**: By building on Etherlink, we've made minting and trading art accessible to everyone, with significantly lower gas fees than on other networks.

## Team

-   **[Bruno Formagio](https://www.brunoformagio.dev/en)**: 15+ years of experience of web development and design. Specialized in building solutions focused on usability and scalability, always seeking the best possible experience for the user.
-   **[FromFriends™](https://from-friends.github.io/)**: Creative developer focused on building innovative platforms that empower artists, collectors and creators in the Web3 ecosystem through thoughtful design and technology.
