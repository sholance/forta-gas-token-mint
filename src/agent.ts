import BigNumber from "bignumber.js";
import { providers } from "ethers";
import { EntityType, Finding, FindingSeverity, FindingType, TransactionEvent, ethers, getEthersProvider, getTransactionReceipt } from "forta-agent";
import SdMath from "./deviation"
import NetworkManager, { NETWORK_MAP } from "./network";
import NetworkData from "./network";
import { BEP20_APPROVE_FUNCTION_SIG, BEP20_INCREASE_ALLOWANCE_FUNCTION_SIG, GAS_TOKEN, GAS_TOKEN_ABI, TRANSFER_EVENT } from "./constants";


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
      const approvedFunctions = txEvent.filterFunction([
          BEP20_APPROVE_FUNCTION_SIG,
          BEP20_INCREASE_ALLOWANCE_FUNCTION_SIG,
      ]);
      const approvalGasCostThreshold = new BigNumber(5500000000000000);


      for (const approvedFunction of approvedFunctions) {
          // const { gasUsed } = await getTransactionReceipt(txEvent.hash)
          const gasUsed = new BigNumber((await getTransactionReceipt(txEvent.hash)).gasUsed);
        let functionGasUsed = gasUsed;
        const functionGasCost = functionGasUsed.multipliedBy(txEvent.gasPrice);

          if (functionGasCost.isGreaterThan(approvalGasCostThreshold)) {
              findings.push(
                  Finding.fromObject({
                      name: "Suspected high gas token mint",
                      description: `Suspicious approval with gas  detected: ${functionGasCost}`,
                      alertId: "GAS-ANOMALOUS-LARGE-APPROVAL",
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
                          metadata: {
                              gasUsed: JSON.stringify(gasUsed),
                          },
                      }]
                  }
                  ))
          }
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
      const gasCost = mintGasUsed.multipliedBy(txEvent.gasPrice);
      const mintGasCostThreshold = new BigNumber(5300000000000000);
      //   if (gasCost.isGreaterThan(mintGasCostThreshold)) {
      //       console.log(`${gasCost} is bigger than ${mintGasCostThreshold}`)
      //   } else {
      //       console.log(`${gasCost} is not bigger than ${mintGasCostThreshold}`)
      //   }

      MintEvents.forEach((mintEvent) => {

          // create finding if gas price is over threshold
          if (gasCost.isGreaterThan(mintGasCostThreshold)) {
              try {
                  findings.push(
                      Finding.fromObject({
                          name: "Suspicious gas token mint",
                          description: `Suspicious mint of gas token detected: ${gasCost}`,
                          alertId: "GAS-ANOMALOUS-TOKEN-MINT",
                          severity: FindingSeverity.High,
                          type: FindingType.Info,
                          metadata: {
                              to: JSON.stringify(txEvent.transaction.to),
                              value: `${gasCost}`
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
                  //   rollingMath.addElement(gasCost);
              }
              catch (error) {
                  console.log(error);
              }
          }


          // rolling average updated
      })
      return findings;
  };
}

export default {
  provideHandleTransaction,
  handleTransaction: provideHandleTransaction(sdMathVar, networkManager),
};