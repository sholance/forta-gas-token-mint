import BigNumber from "bignumber.js";
import { EntityType, Finding, FindingSeverity, FindingType, TransactionEvent, ethers, getTransactionReceipt } from "forta-agent";
import SdMath from "./deviation"
import { TRANSFER_EVENT_ABI, GAS_TOKEN } from "./constants";

// rolling average over 5000 transactions
const sdMathVar = new SdMath(5000);

function provideHandleTransaction(rollingMath: { getAverage: () => any; getStandardDeviation: () => any; addElement: (arg0: any) => void; }) {
  return async function handleTransaction(txEvent: TransactionEvent) {
    const findings: Finding[] = [];

    const GasMintEvents = txEvent
      .filterLog(TRANSFER_EVENT_ABI, GAS_TOKEN)
      .filter((transferEvent) => {
        const { from } = transferEvent.args;
        return from === "0x0000000000000000000000000000000000000000";
      });

    GasMintEvents.forEach((mintEvent) => {
      const { to, value } = mintEvent.args;

      const gasPrice = new BigNumber(value);
      const average = rollingMath.getAverage();
      const standardDeviation = rollingMath.getStandardDeviation();

      const signature = txEvent.transaction.data;
      const sighash = ethers.utils.keccak256(signature).slice(0, 10);

      // Maintain a queue of the most prevalent function signatures
      const functionQueue: { [signature: string]: number } = {};
      if (sighash in functionQueue) {
        functionQueue[sighash]++;
      } else {
        functionQueue[sighash] = 1;
      }

      // create finding if gas price is over 10 standard deviations above the past 5000 txs
      if (gasPrice.isGreaterThan(average.plus(standardDeviation.times(10)))) {
        findings.push(
          Finding.fromObject({
            name: "Suspicious gas token mint",
            description: `Unusually high amount of gas token minted: ${gasPrice}`,
            alertId: "GAS-ANOMALOUS-LARGE-MINT",
            protocol: "chi-gas-token",
            severity: FindingSeverity.High,
            type: FindingType.Info,
            metadata: {
              to,
              value: value.toString(),
            },
            labels: [{
              entityType: EntityType.Address,
              entity: to,
              label: "high-gas-token-mint",
              confidence: 0.8,
              remove: false,
              metadata: {},
    }]
          }
          ))
      }

      // rolling average updated
      rollingMath.addElement(gasPrice);
    });
    return findings;
  };
}

export default {
  provideHandleTransaction,
  handleTransaction: provideHandleTransaction(sdMathVar),
};