import BigNumber from "bignumber.js";
import { providers } from "ethers";
import { EntityType, Finding, FindingSeverity, FindingType, TransactionEvent, ethers, getEthersProvider } from "forta-agent";
import SdMath from "./deviation"
import NetworkManager, { NETWORK_MAP } from "./network";
import NetworkData from "./network";
import { GAS_TOKEN, GAS_TOKEN_ABI, TRANSFER_EVENT } from "./constants";


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
    const gasPrice = new BigNumber(txEvent.transaction.gasPrice);
    // const provider = getEthersProvider();

    // const gasToken = new ethers.Contract(networkData.gasAddress, GAS_TOKEN_ABI, provider);
    // const mintFilter = gasToken.filters.Mint();

    // const mintLogs = await provider.getLogs({
    //   ...mintFilter
    // });

    const signature = txEvent.transaction.data;

    // Maintain a queue of the most prevalent function signatures
    const functionQueue: { [signature: string]: number } = {};
    if (signature in functionQueue) {
      functionQueue[signature]++;
    } else {
      functionQueue[signature] = 1;
    } 

    // const mintEvents = txEvent.filterLog(GAS_TOKEN_ABI, networkData.gasAddress);
    const MintEvents = txEvent
      .filterLog(TRANSFER_EVENT, GAS_TOKEN)
      .filter((transferEvent) => {
        const { from } = transferEvent.args;
        return from === "0x0000000000000000000000000000000000000000";
      });

    MintEvents.forEach((mintEvent) => {
      const { to, value } = mintEvent.args;

      const mintAmount = new BigNumber(value);
      const normalizedValue = ethers.utils.formatEther(value);
      const average = rollingMath.getAverage();
      const standardDeviation = rollingMath.getStandardDeviation();
      //test
      const minThreshold = ethers.utils.parseEther("0");


      // create finding if gas price is over 10 standard deviations above the past 5000 txs
      if (value.gt(minThreshold) || mintAmount.isGreaterThan(average.plus(standardDeviation.times(10)))) {
        try {
        findings.push(
          Finding.fromObject({
            name: "Suspicious gas token mint",
            description: `Suspicious mint of gas token detected: ${normalizedValue}`,
            alertId: "GAS-ANOMALOUS-LARGE-MINT",
            severity: FindingSeverity.High,
            type: FindingType.Info,
            metadata: {
              to: JSON.stringify(txEvent.transaction.to),
              value: normalizedValue
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
          rollingMath.addElement(value);

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