import BigNumber from "bignumber.js";
import { providers } from "ethers";
import { EntityType, Finding, FindingSeverity, FindingType, TransactionEvent, ethers, getEthersProvider, getTransactionReceipt, keccak256 } from "forta-agent";
import SdMath from "./deviation"
import NetworkManager, { NETWORK_MAP } from "./network";
import NetworkData from "./network";
import { getAllAbis } from "./utils";
import { BEP20_APPROVE_FUNCTION_SIG, BEP20_INCREASE_ALLOWANCE_FUNCTION_SIG, TRANSFER_EVENT } from "./constants";


const networkManager = new NetworkManager(NETWORK_MAP);

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
      const ercFunctions = txEvent.filterLog([
          BEP20_APPROVE_FUNCTION_SIG,
          BEP20_INCREASE_ALLOWANCE_FUNCTION_SIG,
      ]);


      for (const ercFunction of ercFunctions) {
          const gasUsed = new BigNumber((await getTransactionReceipt(txEvent.hash)).gasUsed);
        let functionGasUsed = gasUsed;
          const average = rollingMath.getAverage();
          const standardDeviation = rollingMath.getStandardDeviation();
          //   const gasCost = mintGasUsed.multipliedBy(txEvent.gasPrice);

          //random test
          if (functionGasUsed.isGreaterThan(average.plus(standardDeviation.times(2)))) {
              console.log(`${functionGasUsed} is bigger than ${average.plus(standardDeviation.times(2))}`)
          } else {
              console.log(`${functionGasUsed} is not bigger than ${average.plus(standardDeviation.times(2))}`)
          }

          // create finding if gas price is over 2 times standard deviations above the past 5000 txs
          if (functionGasUsed.isGreaterThan(average.plus(standardDeviation.times(2)))) {
              findings.push(
                  Finding.fromObject({
                      name: "Suspected high gas token mint",
                      description: `Suspicious approval with gas  detected: ${functionGasUsed}`,
                      alertId: "GAS-ANOMALOUS-LARGE-APPROVAL",
                      severity: FindingSeverity.High,
                      type: FindingType.Info,
                      metadata: {
                          to: JSON.stringify(txEvent.transaction.to),
                          value: JSON.stringify(functionGasUsed)
                      },
                      labels: [{
                          entityType: EntityType.Address,
                          entity: JSON.stringify(txEvent.transaction.to),
                          label: "sus-gas-token-mint",
                          confidence: 0.8,
                          remove: false,
                          metadata: {
                              gasUsed: JSON.stringify(gasUsed),
                          },
                      }]
                  }
                  ))
          }
          rollingMath.addElement(functionGasUsed);

      }

      // const mintEvents = txEvent.filterLog(GAS_TOKEN_ABI, networkData.gasAddress);
      const MintEvents = txEvent
          .filterLog(TRANSFER_EVENT)
          .filter((transferEvent) => {
              const { from } = transferEvent.args;
              return from === "0x0000000000000000000000000000000000000000";
          });
      const { gasUsed } = await getTransactionReceipt(txEvent.hash)
      const mintGasUsed = new BigNumber(gasUsed);
      //   const gasCost = mintGasUsed.multipliedBy(txEvent.gasPrice);

      MintEvents.forEach((mintEvent) => {
          const average = rollingMath.getAverage();
          const standardDeviation = rollingMath.getStandardDeviation();
          // create finding if gas price is over 2 times standard deviations above the past 5000 txs
          //test
          if (mintGasUsed.isGreaterThan(average.plus(standardDeviation.times(2)))) {
              console.log(`${mintGasUsed} is bigger than ${average.plus(standardDeviation.times(2))}`)
          } else {
              console.log(`${mintGasUsed} is not bigger than ${average.plus(standardDeviation.times(2))}`)
          }
          if (mintGasUsed.isGreaterThan(average.plus(standardDeviation.times(2)))) {
              try {
                  findings.push(
                      Finding.fromObject({
                          name: "Suspicious gas token mint",
                          description: `Suspicious mint of gas token detected: ${mintGasUsed}`,
                          alertId: "GAS-ANOMALOUS-TOKEN-MINT",
                          severity: FindingSeverity.High,
                          type: FindingType.Info,
                          metadata: {
                              to: JSON.stringify(txEvent.transaction.to),
                              value: `${mintGasUsed}`
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
              catch (error) {
                  console.log(error);
              }
          }
          rollingMath.addElement(mintGasUsed);
          // rolling average updated
      })
      return findings;
  };
}

export default {
  provideHandleTransaction,
  handleTransaction: provideHandleTransaction(sdMathVar, networkManager),
};