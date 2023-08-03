import BigNumber from "bignumber.js";
import { providers } from "ethers";
import {
  EntityType,
  Finding,
  FindingSeverity,
  FindingType,
  TransactionEvent,
  getTransactionReceipt,
} from "forta-agent";
import SdMath from "./deviation";
import NetworkManager, { NETWORK_MAP } from "./network";
import { processFindings } from "./processFinding";

const networkManager = new NetworkManager(NETWORK_MAP);

let findingsCount = 0;
let valueRange = false;

export const initialize = (provider: providers.Provider) => {
  return async () => {
    try {
      const { chainId } = await provider.getNetwork();
      networkManager.setNetwork(chainId);
    } catch (error) {
      console.error("Initialization error:", error);
    }
  };
};

const rollingAverageCalculator = new SdMath(5000);

const provideHandleTransaction = (rollingMath: SdMath) => {
  return async (txEvent: TransactionEvent) => {
    const findings: Finding[] = [];

    if (findingsCount >= 5) return findings;

    try {
      const { logs } = await getTransactionReceipt(txEvent.hash);

      if (logs) {
        for (const log of logs) {
          const { data: dataValue } = log;
          if (dataValue !== "0x" && BigInt(dataValue) < 500) {
            valueRange = true;
          }
        }
      }
      const numberOfEvents = logs.length;

      const receipt = await getTransactionReceipt(txEvent.hash);
      const { gasUsed } = receipt;
      const functionGasUsed = new BigNumber(gasUsed);
      const average = rollingMath.getAverage();
      const standardDeviation = rollingMath.getStandardDeviation();

    // Calculate the frequency of each function hash
    const frequency: { [key: string]: bigint } = {};
    const functionHash = txEvent.transaction.data.slice(0, 10);
    if (functionHash in frequency) {
      frequency[functionHash]++;
    } else {
      frequency[functionHash] = BigInt(1);
    }

    // Filter out the most popular functionHashes
    const popularFunctionHashList = Object.keys(frequency).filter(
      (functionHash) => {
        const mostPopularFunctionHashes = [
          "0x095ea7b3", // approve
          "0x18160ddd", // totalSupply
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
      }
    );

    // Process each popular function hash
    for (const popularFunctionHash of popularFunctionHashList) {

        const gasThreshold = average.plus(standardDeviation.times(8));
        const staticGasThreshold = 5_000_000;
        const maxNumberOfEvents = 3;

        if (
          receipt.status &&
          valueRange &&
          functionGasUsed.isGreaterThan(staticGasThreshold) &&
          numberOfEvents < maxNumberOfEvents
        ) {
          findings.push(
            Finding.fromObject({
              name: "Suspected high gas token mint",
              description: `Suspicious function with anomalous gas detected: ${functionGasUsed}`,
              alertId: "GAS-ANOMALOUS-LARGE-CONSUMPTION",
              severity: FindingSeverity.High,
              type: FindingType.Info,
              metadata: {
                value: JSON.stringify(functionGasUsed),
                deployer: JSON.stringify(txEvent.transaction.from),
                contractAddress: JSON.stringify(txEvent.transaction.to),
                function: JSON.stringify(`MethodId is ${functionHash}`),
                mean: JSON.stringify(
                average
                ),
                threshold: JSON.stringify(staticGasThreshold)
              },
              labels: [
                {
                  entity: txEvent.hash,
                  entityType: EntityType.Transaction,
                  label: `MethodID ${functionHash}`,
                  confidence: 1,
                  remove: false,
                  metadata: {},
                },
                {
                  entityType: EntityType.Address,
                  entity: JSON.stringify(txEvent.transaction.to),
                  label: "sus-gas-consumption",
                  confidence: 0.8,
                  remove: false,
                  metadata: {
                    gasUsed: JSON.stringify(functionGasUsed),
                    contractAddress: JSON.stringify(txEvent.transaction.to),
                    mean: JSON.stringify(
                        average                    
                        ),
                    gasThreshold: JSON.stringify(staticGasThreshold)
                  },
                },
              ],
            })
          );    
          findingsCount++;
        }
      }

      rollingMath.addElement(functionGasUsed);
    } catch (error) {
      console.error("Error in handleTransaction:", error);
    }

    if (findings.length > 0) {
      await processFindings(findings);
    }

    return findings;
  };
};

export default {
  provideHandleTransaction,
  handleTransaction: provideHandleTransaction(rollingAverageCalculator),
  };
  
  