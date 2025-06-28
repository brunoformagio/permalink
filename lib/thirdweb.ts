import { createThirdwebClient } from "thirdweb";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import { defineChain } from "thirdweb/chains";

if (!process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID) {
  throw new Error("NEXT_PUBLIC_THIRDWEB_CLIENT_ID is not set");
}

// Get environment configuration
const environment = process.env.NEXT_PUBLIC_ENVIRONMENT || "testnet";
const isMainnet = environment === "mainnet";
const chainId = isMainnet 
  ? parseInt(process.env.NEXT_PUBLIC_ETHERLINK_CHAIN_ID_MAINNET || "42793")
  : parseInt(process.env.NEXT_PUBLIC_ETHERLINK_CHAIN_ID_TESTNET || "128123");

// Create the thirdweb client
export const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID,
});

// Define Etherlink chain configuration
export const etherlinkChain = defineChain({
  id: chainId,
  name: isMainnet ? "Etherlink Mainnet" : "Etherlink Testnet",
  nativeCurrency: {
    name: "Tez",
    symbol: "XTZ", 
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: isMainnet 
        ? ["https://node.mainnet.etherlink.com"]
        : ["https://node.ghostnet.etherlink.com"],
    },
  },
  blockExplorers: {
    default: {
      name: "Etherlink Explorer",
      url: isMainnet 
        ? "https://explorer.etherlink.com" 
        : "https://testnet.explorer.etherlink.com",
    },
  },
  testnet: !isMainnet,
});

// Define the wallets we want to support
export const wallets = [
  createWallet("io.metamask"), // MetaMask
  inAppWallet({
    auth: {
      options: ["google", "email"], // Google and email authentication
    },
  }),
];

// Export the active chain and network info
export const activeChain = etherlinkChain;
export const networkInfo = {
  chainId,
  name: etherlinkChain.name,
  isMainnet,
  environment,
  currency: "XTZ",
}; 