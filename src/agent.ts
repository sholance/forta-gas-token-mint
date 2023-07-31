import BigNumber from "bignumber.js";
import { providers } from "ethers";
import { EntityType, Finding, FindingSeverity, FindingType, Log, TransactionEvent, ethers, getEthersProvider, getTransactionReceipt, keccak256 } from "forta-agent";
import SdMath from "./deviation"
import NetworkManager, { NETWORK_MAP } from "./network";
import NetworkData from "./network";
import { getAllAbis, EVENT_TOPIC_TO_FRAGMENT, processInputsMetadata, filterLog } from "./utils";

const networkManager = new NetworkManager(NETWORK_MAP);



export const initialize = (provider: providers.Provider) => {
  return async () => {
    const eventMap: { [signature: string]: boolean } = {};
    const abis = getAllAbis();
    const { chainId } = await provider.getNetwork();
    networkManager.setNetwork(chainId);
    try {
      for (const abi of abis) {
        const eventSignatureToFragmentMap = abi.events;
        for (const signature of Object.keys(eventSignatureToFragmentMap)) {
          // de-dupe events using signature
          const fragment = eventSignatureToFragmentMap[signature];
          const topic = keccak256(signature);
          if (!eventMap[signature]) {
            eventMap[signature] = true;
            EVENT_TOPIC_TO_FRAGMENT[topic] = [fragment];
            processInputsMetadata(fragment);
          } else {
            // handle the case where event signature is same, but its a valid different event (only required for Transfer and Approval events)
            // i.e. ERC-20 Transfer vs ERC-721 Transfer have same signature but the last argument is indexed only for ERC-721
            const originalFragment = EVENT_TOPIC_TO_FRAGMENT[topic][0];
            let sameArgsIndexed = true;
            fragment.inputs.forEach((input, index) => {
              if (originalFragment.inputs[index].indexed != input.indexed) {
                sameArgsIndexed = false;
              }
            });
            if (!sameArgsIndexed) {
              // erc-721 events have all arguments indexed
              const isErc721Event = fragment.inputs.every(
                (input) => input.indexed
              );
              // keep erc20 fragments at position 0 as perf optimization
              if (isErc721Event) {
                EVENT_TOPIC_TO_FRAGMENT[topic].push(fragment);
              } else {
                EVENT_TOPIC_TO_FRAGMENT[topic][0] = fragment;
                EVENT_TOPIC_TO_FRAGMENT[topic][1] = originalFragment;
              }
              processInputsMetadata(fragment);
            }
          }
        }
      }
    }
    catch (e: any) {
      console.log("error during initialization:", e.message);
      console.log("exiting process...");
      process.exit();
    }
  };
};


// rolling average over 5000 transactions
const sdMathVar = new SdMath(5000);

export function provideHandleTransaction(rollingMath: { getAverage: () => any; getStandardDeviation: () => any; addElement: (arg0: any) => void; },
  networkData: NetworkData,
) {
  return async function handleTransaction(txEvent: TransactionEvent) {
    const findings: Finding[] = [];

    try {
      const events = filterLog(txEvent.logs);
      const gasUsed = new BigNumber((await getTransactionReceipt(txEvent.hash)).gasUsed);
      const gasPrice = BigInt(txEvent.transaction.gasPrice);
      events.forEach((event) => {
        // const { gasUsed } = await getTransactionReceipt(txEvent.hash)
        let THRESHOLD_GAS = 300_000;
        let functionGasUsed = gasUsed;
        const functionGasCost = functionGasUsed.multipliedBy(txEvent.gasPrice);
        if (functionGasCost.gt(THRESHOLD_GAS)) {
          findings.push(
            Finding.fromObject({
              name: "Suspicious gas token mint",
              description: `Suspicious mint of gas token detected: ${functionGasCost}`,
              alertId: "GAS-ANOMALOUS-LARGE-MINT",
              severity: FindingSeverity.High,
              type: FindingType.Info,
              metadata: {
                to: JSON.stringify(txEvent.transaction.to),
                value: JSON.stringify(functionGasCost)
              },
              labels: [{
                entityType: EntityType.Address,
                entity: JSON.stringify(txEvent.transaction.to),
                label: "sus-gas-token-mint",
                confidence: 0.8,
                remove: false,
                metadata: {},
              }]
            }
            ))
        }
      })
      return findings;
    }
    catch (error) {
      console.log(error);
    }
  };
}

export default {
  provideHandleTransaction,
  handleTransaction: provideHandleTransaction(sdMathVar, networkManager),
};