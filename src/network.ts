import { GAS_TOKEN } from "./constants";

interface NetworkData {
    gasAddress: string;
}

const BSC_DATA: NetworkData = {
    gasAddress: GAS_TOKEN,
};

const BSC_TESTNET_DATA: NetworkData = {
    gasAddress: GAS_TOKEN,
};

const POLYGON_DATA: NetworkData = {
    gasAddress: GAS_TOKEN,
};

export const NETWORK_MAP: Record<number, NetworkData> = {
    56: BSC_DATA,
    137: POLYGON_DATA,
    97: BSC_TESTNET_DATA,
};

export default class NetworkManager implements NetworkData {
    public gasAddress: string;
    networkMap: Record<number, NetworkData>;

    constructor(networkMap: Record<number, NetworkData>) {
        this.gasAddress = "0x0000000000000000000000000000000000000000";
        this.networkMap = networkMap;
    }

    public setNetwork(networkId: number) {
        try {
            const { gasAddress } = this.networkMap[networkId];
            this.gasAddress = gasAddress;
        } catch {
            throw new Error("You are running the bot in a unsupported network");
        }
    }
}