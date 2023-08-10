import { providers, Contract, BigNumber, ethers } from "ethers";
import { etherscanApis } from "./config";

interface apiKeys {
  bscscanApiKeys: string[];
  polygonscanApiKeys: string[];
}


export default class Fetcher {
  provider: providers.JsonRpcProvider | undefined;
  private apiKeys: apiKeys;
  constructor(provider: ethers.providers.JsonRpcProvider, apiKeys: apiKeys) {
    this.apiKeys = apiKeys;
    this.provider = provider;
  }
    private getBlockExplorerKey = (chainId: number) => {
    switch (chainId) {
      case 56:
        return this.apiKeys.bscscanApiKeys.length > 0
          ? this.apiKeys.bscscanApiKeys[Math.floor(Math.random() * this.apiKeys.bscscanApiKeys.length)]
          : process.env.BSC_API_KEY;
      case 137:
        return this.apiKeys.polygonscanApiKeys.length > 0
          ? this.apiKeys.polygonscanApiKeys[Math.floor(Math.random() * this.apiKeys.polygonscanApiKeys.length)]
          : process.env.POLYGON_API_KEY;
    }
  };
  public getContractCreator = async (address: string, chainId: number) => {
    const { urlContractCreation } = etherscanApis[chainId];
    const key = this.getBlockExplorerKey(chainId);
    const url = `${urlContractCreation}&contractaddresses=${address}&apikey=${key}`;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await (await fetch(url)).json();

        if (
          result.message.startsWith("NOTOK") ||
          result.message.startsWith("No data") ||
          result.message.startsWith("Query Timeout")
        ) {
          console.log(`Block explorer error occurred (attempt ${attempt}); retrying check for ${address}`);
          if (attempt === maxRetries) {
            console.log(`Block explorer error occurred (final attempt); skipping check for ${address}`);
            return null;
          }
        } else {
          return result.result[0].contractCreator;
        }
      } catch (error) {
        console.error(`An error occurred during the fetch (attempt ${attempt}):`, error);
        if (attempt === maxRetries) {
          console.error(`Error during fetch (final attempt); skipping check for ${address}`);
          return null;
        }
      }
    }

    console.error(`Failed to fetch contract creator for ${address} after ${maxRetries} retries`);
    return null;
  };

}