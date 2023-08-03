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
//personal findings local logger
import { processFindings } from "./processFinding";

// Create an instance of NetworkManager
const networkManager = new NetworkManager(NETWORK_MAP);

// Variable to keep track of the number of findings
let findingsCount = 0;

// Track data value
let valueRange = false; 

// Initialization function
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

// Create an instance of SdMath for rolling average calculation over 5000 transactions
const rollingAverageCalculator = new SdMath(5000);

// Function to handle the transaction event
const provideHandleTransaction = (rollingMath: SdMath) => {
  return async (txEvent: TransactionEvent) => {
    const findings: Finding[] = [];

    // Limit the number of findings to 5
    if (findingsCount >= 5) return findings;

    try {
      // Calculate the frequency of each function hash
      const frequency: { [key: string]: bigint } = {};
      const functionHash = txEvent.transaction.data.slice(0, 10);
      if (functionHash in frequency) {
        frequency[functionHash]++;
      } else {
        frequency[functionHash] = BigInt(1);
      }

        // Filter out the most popular functionHashes
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

          const popularFunctionHashesList = mostPopularFunctionHashes.filter(
            (hash) => hash in frequency
          );
          
          // Add infrequent function hashes dynamically to the list
          for (const hash in frequency) {
            if (!mostPopularFunctionHashes.includes(hash)) {
              popularFunctionHashesList.push(hash);
            }
          }
          
          // Rotate among the popular function hashes using for...of loop
          let currentIndex = 0;
          
          
      const { logs } = await getTransactionReceipt(txEvent.hash);
      if (logs) {
          logs.forEach((log) => {
              const dataValue = log.data;
              if (dataValue !== "0x" && BigInt(dataValue) < 100) {
                  valueRange = true
              }
            });
                }
      // Process each popular function hash
      for (const popularFunctionHash of popularFunctionHashesList) {
        currentIndex = (currentIndex + 1) % popularFunctionHashesList.length;      
        const { gasUsed } = await getTransactionReceipt(txEvent.hash);
        const functionGasUsed = new BigNumber(gasUsed);
        const average = rollingMath.getAverage();
        const standardDeviation = rollingMath.getStandardDeviation();

        const numberOfEvents = logs.length;

        // Create finding if gas price ia over 9 times standard deviations above the past 5000 txs
        // and sample size to be over 1000 with log less than 2
        const gasThreshold = average.plus(standardDeviation.times(8));
        const minSampleSize = 100;
        const maxNumberOfEvents = 2;
        if (
            valueRange &&
          functionGasUsed.isGreaterThan(gasThreshold) &&
          rollingMath.getNumElements() > minSampleSize &&
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
                function: JSON.stringify(`MethodId is ${popularFunctionHash}`),
                standardDev: JSON.stringify(
                standardDeviation
                ),
                threshold: JSON.stringify(gasThreshold)
              },
              labels: [
                {
                  entity: txEvent.hash,
                  entityType: EntityType.Transaction,
                  label: `MethodID ${popularFunctionHash}`,
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
                    standardDev: JSON.stringify(
                        standardDeviation                    
                        ),
                    gasThreshold: JSON.stringify(gasThreshold)
                  },
                },
              ],
            })
          );
        }

        // Add the functionGasUsed to the rolling average calculation
        rollingMath.addElement(functionGasUsed);
      }
    } catch (error) {
      console.error("Handling transaction event error:", error);
    }
    // log findings locally
    processFindings(findings)
    return findings;
  };
};

export default {
  provideHandleTransaction,
  handleTransaction: provideHandleTransaction(rollingAverageCalculator),
};