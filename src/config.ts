interface etherscanApisInterface {
  [key: number]: {
    urlContract: string;
    urlAccount: string;
    urlContractCreation: string;
  };
}

export const etherscanApis: etherscanApisInterface = {
  56: {
    urlContract: "https://api.bscscan.com/api?module=contract&action=getabi",
    urlAccount: "https://api.bscscan.com/api?module=account&action=txlist",
    urlContractCreation: "https://api.bscscan.com/api?module=contract&action=getcontractcreation",
  },
  137: {
    urlContract: "https://api.polygonscan.com/api?module=contract&action=getabi",
    urlAccount: "https://api.polygonscan.com/api?module=account&action=txlist",
    urlContractCreation: "https://api.polygonscan.com/api?module=contract&action=getcontractcreation",
  }
};
export const keys = {
  bscscanApiKeys: [],
  polygonscanApiKeys: []
};