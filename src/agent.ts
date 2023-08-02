import BigNumber from "bignumber.js";
import { providers } from "ethers";
import { EntityType, Finding, FindingSeverity, FindingType, TransactionEvent, ethers, getEthersProvider, getTransactionReceipt, keccak256 } from "forta-agent";
import SdMath from "./deviation"
import NetworkManager, { NETWORK_MAP } from "./network";
import NetworkData from "./network";
import { BEP20_APPROVE_FUNCTION_SIG, BEP20_INCREASE_ALLOWANCE_FUNCTION_SIG, TRANSFER_EVENT } from "./constants";


const networkManager = new NetworkManager(NETWORK_MAP);
let findingsCount = 0;


export const initialize = (provider: providers.Provider) => {
    return async () => {
    const { chainId } = await provider.getNetwork();
        networkManager.setNetwork(chainId);
  };
};
// rolling average over 5000 transactions
const sdMathVar = new SdMath(5000);


function provideHandleTransaction(rollingMath: { getAverage: () => any; getStandardDeviation: () => any; addElement: (arg0: any) => void; },
  networkData: NetworkData,
) {
  return async function handleTransaction(txEvent: TransactionEvent) {
    const findings: Finding[] = [];

      // limiting this agent to emit only 5 findings so that the alert feed is not spammed
      if (findingsCount >= 5) return findings;


      const frequency: { [key: string]: bigint } = {};

      const functionHash = txEvent.transaction.data.slice(0, 10);
      if (functionHash in frequency) {
          frequency[functionHash]++;
      } else {
          frequency[functionHash] = BigInt(1);
      }

      // Filter out the most popular functionHashes
      const popularFunctionHasheslist = Object.keys(frequency).filter((functionHash) => {
          const mostPopularFunctionHashes = [
              "0x095ea7b3", // approve
              "0x313ce567", // decimals
              "0x18160ddd", // totalSupply
              "0x70a08231", // balanceOf
              "0xa9059cbb", // transfer
              "0x23b872dd", // transferFrom
              "0x8f20c609", // allowance
              "0x42966c68", // burn
              "0x4e71d92d", // claim
              "0x095ea7b3", // name
              "0x313ce567", // symbol
              "0x8c5be1e5", // Approval
          ];
          return mostPopularFunctionHashes.includes(functionHash);
      });




      for (const popularFunctionHash of popularFunctionHasheslist) {
          //   console.log(`${popularFunctionHash} is here`)
      //   const gasCost = mintGasUsed.multipliedBy(txEvent.gasPrice);
          //random test

          const { gasUsed } = await getTransactionReceipt(txEvent.hash)
          const functionGasUsed = new BigNumber(gasUsed);
          const average = rollingMath.getAverage();
          const standardDeviation = rollingMath.getStandardDeviation();

          //   const gasCost = mintGasUsed.multipliedBy(txEvent.gasPrice);
          //random test
          //   if (functionGasUsed.isGreaterThan(average.plus(standardDeviation.times(3)))) {
          //       console.log(`${functionGasUsed} is bigger than ${average.plus(standardDeviation.times(3))}`)
          //   } else {
          //       console.log(`${functionGasUsed} is not bigger than ${average.plus(standardDeviation.times(3))}`)
          //   }

          // create finding if gas price is over 3 times standard deviations above the past 5000 txs
          if (functionGasUsed.isGreaterThan(average.plus(standardDeviation.times(3)))) {
              findings.push(
                  Finding.fromObject({
                      name: "Suspected high gas token mint",
                      description: `Suspicious approval with gas  detected: ${functionGasUsed}`,
                      alertId: "GAS-ANOMALOUS-LARGE-CONSUMPTION",
                      severity: FindingSeverity.High,
                      type: FindingType.Info,
                      metadata: {
                          to: JSON.stringify(txEvent.transaction.to),
                          value: JSON.stringify(functionGasUsed),
                          standardDev: JSON.stringify(average.plus(standardDeviation.times(3)))
                        },
                      labels: [{
                          entityType: EntityType.Address,
                          entity: JSON.stringify(txEvent.transaction.to),
                          label: "sus-gas-consumption",
                          confidence: 0.8,
                          remove: false,
                          metadata: {
                              gasUsed: JSON.stringify(functionGasUsed),
                              standardDev: JSON.stringify(average.plus(standardDeviation.times(3)))
                          },
                      }]
                  }
                  ))
          }
          rollingMath.addElement(functionGasUsed);

      }
      return findings;
  };
}

export default {
  provideHandleTransaction,
  handleTransaction: provideHandleTransaction(sdMathVar, networkManager),
};