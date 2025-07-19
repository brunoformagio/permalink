import { getContract } from "thirdweb";
import { client } from "@/lib/thirdweb";
import { defineChain } from "thirdweb/chains";

// Environment configuration
export const getEnvironment = () => {
  return process.env.NEXT_PUBLIC_ENVIRONMENT || "testnet";
};

export const isMainnet = () => {
  return getEnvironment() === "mainnet";
};

// Contract address configuration
export const getContractAddress = () => {
  const environment = getEnvironment();
  return environment === "mainnet" 
    ? process.env.NEXT_PUBLIC_PERMALINK_CONTRACT_ADDRESS_MAINNET
    : process.env.NEXT_PUBLIC_PERMALINK_CONTRACT_ADDRESS_TESTNET;
};

// Marketplace contract address configuration
export const getMarketplaceAddress = () => {
  const environment = getEnvironment();
  return environment === "mainnet" 
    ? process.env.NEXT_PUBLIC_PERMALINK_MARKETPLACE_ADDRESS_MAINNET
    : process.env.NEXT_PUBLIC_PERMALINK_MARKETPLACE_ADDRESS_TESTNET;
};

// Chain configuration
export const getEtherlinkChain = () => {
  const mainnet = isMainnet();
  return defineChain(mainnet ? 42793 : 128123);
};

// Contract instance factory
export const getPermalinkContract = () => {
  const contractAddress = getContractAddress();
  
  if (!contractAddress) {
    throw new Error(`Contract address not configured for ${getEnvironment()} environment`);
  }

  return getContract({
    client,
    chain: getEtherlinkChain(),
    address: contractAddress,
  });
};

// Network information
export const getNetworkInfo = () => {
  const environment = getEnvironment();
  const mainnet = isMainnet();
  
  return {
    environment,
    isMainnet: mainnet,
    chainId: mainnet ? 42793 : 128123,
    networkName: mainnet ? "Etherlink Mainnet" : "Etherlink Testnet",
    explorerUrl: mainnet 
      ? "https://explorer.etherlink.com" 
      : "https://testnet.explorer.etherlink.com",
    rpcUrl: mainnet
      ? "https://node.mainnet.etherlink.com"
      : "https://node.ghostnet.etherlink.com",
    contractAddress: getContractAddress(),
  };
}; 