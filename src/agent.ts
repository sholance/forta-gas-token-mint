import BigNumber from "bignumber.js";
import { providers } from "ethers";
import { EntityType, Finding, FindingSeverity, FindingType, TransactionEvent } from "forta-agent";
import SdMath from "./deviation"
import NetworkManager, { NETWORK_MAP } from "./network";
import NetworkData from "./network";
import { TRANSFER_EVENT_ABI, GAS_TOKEN, providerParamsType, providerParams } from "./constants";


const networkManager = new NetworkManager(NETWORK_MAP);

export const initialize = (provider: providers.Provider) => {
  return async () => {
    const { chainId } = await provider.getNetwork();
    networkManager.setNetwork(chainId);
  };
};
// rolling average over 5000 transactions
const sdMathVar = new SdMath(5000);

function provideHandleTransaction(rollingMath: { getAverage: () => any; getStandardDeviation: () => any; addElement: (arg0: any) => void; }, functionAbi: providerParamsType,
  networkData: NetworkData,
) {
  return async function handleTransaction(txEvent: TransactionEvent) {
    const findings: Finding[] = [];

    const txLogs = txEvent.filterFunction(functionAbi, networkData.gasAddress);


    txLogs.forEach((txLog: any) => {
      const { transaction } = txEvent;
      const { to, from } = transaction;
      const { args } = txLog;
      const [amount] = args;

      const gasMinted = new BigNumber(amount);
      const Data = {
        from: from.toString(),
        to: to?.toString(),
      };



      const average = rollingMath.getAverage();
      const standardDeviation = rollingMath.getStandardDeviation();

      const signature = txEvent.transaction.data;

      // Maintain a queue of the most prevalent function signatures
      const functionQueue: { [signature: string]: number } = {};
      if (signature in functionQueue) {
        functionQueue[signature]++;
      } else {
      functionQueue[signature] = 1;
      }

      // create finding if gas price is over 10 standard deviations above the past 5000 txs
      if (gasMinted.isGreaterThan(average.plus(standardDeviation.times(10)))) {
        findings.push(
          Finding.fromObject({
            name: "Suspicious gas token mint",
            description: `Unusually high amount of gas token minted: ${gasMinted}`,
            alertId: "GAS-ANOMALOUS-LARGE-MINT",
            protocol: "chi-gas-token",
            severity: FindingSeverity.High,
            type: FindingType.Info,
            metadata: {
              to: JSON.stringify(txEvent.transaction.to),
              value: JSON.stringify(txEvent.transaction.gasPrice),
            },
            labels: [{
              entityType: EntityType.Address,
              entity: JSON.stringify(txEvent.transaction.to),
              label: "high-gas-token-mint",
              confidence: 0.8,
              remove: false,
              metadata: {},
    }]
          }
          ))
      }

      // rolling average updated
      rollingMath.addElement(gasMinted);
    });
    return findings;
  };
}

export default {
  provideHandleTransaction,
  handleTransaction: provideHandleTransaction(sdMathVar, providerParams, networkManager),
};