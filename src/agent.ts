import BigNumber from "bignumber.js";
import { providers } from "ethers";
import {
  EntityType,
  Finding,
  FindingSeverity,
  FindingType,
  HandleTransaction,
  Receipt,
  TransactionEvent,
  ethers,
  getTransactionReceipt,
} from "forta-agent";
import SdMath from "./deviation";
import NetworkManager, { NETWORK_MAP } from "./network";
import { processFindings } from "./processFinding";

const networkManager = new NetworkManager(NETWORK_MAP);

let valueRange = false;
let transactionsProcessed = 0;
let lastBlock = 0;

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

export function provideHandleTransaction(
  rollingMath: SdMath,
  getTransactionReceiptFn: (txHash: string) => Promise<Receipt>
): HandleTransaction {
  return async (txEvent: TransactionEvent): Promise<Finding[]> => {
    let findings: Finding[] = [];

    if (txEvent.blockNumber !== lastBlock) {
      lastBlock = txEvent.blockNumber;
      console.log(`-----Transactions processed in block ${txEvent.blockNumber - 1}: ${transactionsProcessed}-----`);
      transactionsProcessed = 0;
    }
    transactionsProcessed += 1;

    const maxRetries = 2;
    let retryCount = 0;
    let numberOfEvents = 0;
    let functionGasUsed = new BigNumber(0);

    let receipt: Receipt | undefined;

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

    while (retryCount <= maxRetries) {
      try {
        receipt = await getTransactionReceiptFn(txEvent.hash);
        const { gasUsed, logs } = receipt;
        functionGasUsed = new BigNumber(gasUsed);
        numberOfEvents = logs.length;
        if (logs) {
          for (const log of logs) {
            const { data: dataValue } = log;
            if (dataValue !== "0x" && BigInt(dataValue) < 700) {
              valueRange = true;
            }
          }
        }
        break;
      } catch (error) {
        console.log(`Attempt ${retryCount + 1} to fetch transaction receipt failed`);
        if (retryCount === maxRetries) {
          throw new Error(`Failed to retrieve transaction receipt after ${maxRetries + 1} attempts`);
        }
        retryCount++;
        // wait for 1 second before retrying
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    const maxNumberOfEvents = 3;
    const staticGasThreshold = 5000000;

    for (const popularFunctionHash of popularFunctionHashList) {
      if (
        receipt?.status &&
        functionGasUsed.isGreaterThan(staticGasThreshold) &&
        valueRange &&
        numberOfEvents < maxNumberOfEvents
      ) {
        let hash = popularFunctionHash;
        const average = rollingMath.getAverage();
        const addressTo = JSON.stringify(txEvent.transaction.to);

        findings.push(
          Finding.fromObject({
            name: "Suspected high gas token mint",
            description: `Suspicious function with anomalous gas detected: ${functionGasUsed}`,
            alertId: "GAS-ANOMALOUS-LARGE-CONSUMPTION",
            severity: FindingSeverity.High,
            type: FindingType.Info,
            metadata: {
              value: functionGasUsed.toString(),
              deployer: addressTo,
              contractAddress: addressTo,
              function: `MethodId is ${hash}`,
              mean: average.toString(),
              threshold: staticGasThreshold.toString(),
            },
            labels: [
              {
                entity: txEvent.hash,
                entityType: EntityType.Transaction,
                label: `MethodID ${hash}`,
                confidence: 1,
                remove: false,
                metadata: {},
              },
              {
                entityType: EntityType.Address,
                entity: addressTo,
                label: "sus-gas-consumption",
                confidence: 0.8,
                remove: false,
                metadata: {
                  gasUsed: functionGasUsed.toString(),
                  contractAddress: addressTo,
                  mean: average.toString(),
                  gasThreshold: staticGasThreshold.toString(),
                },
              },
            ],
          })
        );
        rollingMath.addElement(functionGasUsed);
        processFindings(findings);
      }
    }

    let allAlerts = 0;
    allAlerts += 1;
    return findings;
  };
}

export default {
  provideHandleTransaction,
  handleTransaction: provideHandleTransaction(rollingAverageCalculator, getTransactionReceipt),
};