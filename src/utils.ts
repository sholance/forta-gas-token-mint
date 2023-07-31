import fs from "fs";
import path from "path";
import { Log, ethers } from "forta-agent";

interface RepositoryTreeNode {
    path: string;
    mode: string;
    type: string;
    sha: string;
    size?: number;
    url: string;
}

interface RepositoryTree {
    sha: string;
    url: string;
    tree: RepositoryTreeNode[];
    truncated: boolean;
}

interface RepositoryConfig {
    owner: string;
    name: string;
    branch: string;
    path: string;
}
type InputsMetadata = {
    indexed: Array<ethers.utils.ParamType>;
    nonIndexed: Array<ethers.utils.ParamType>;
    dynamic: Array<boolean>;
};


export function getAllAbis(): ethers.utils.Interface[] {
    const abis: ethers.utils.Interface[] = [];
    const paths = [`${__dirname}${path.sep}abis`];
    let currPath: string | undefined;
    while (true) {
        currPath = paths.pop();
        if (!currPath) break;

        const items = fs.readdirSync(currPath);
        const files = items.filter((item) => item.endsWith(".json"));
        for (const file of files) {
            abis.push(getAbi(`${currPath}${path.sep}${file}`));
        }
        const folders = items.filter((item) => !item.endsWith(".json"));
        for (const folder of folders) {
            paths.push(`${currPath}${path.sep}${folder}`);
        }
    }
    return abis;
}

export function getAbi(filePath: string): ethers.utils.Interface {
    const { abi } = JSON.parse(fs.readFileSync(filePath).toString());
    return new ethers.utils.Interface(abi);
}

export let EVENT_TOPIC_TO_FRAGMENT: { [topic: string]: ethers.utils.EventFragment[] } =
    {};
export let FRAGMENT_TO_INPUTS_METADATA = new Map<
    ethers.utils.Fragment,
    InputsMetadata
>();
let abiCoder = new ethers.utils.AbiCoder();

export function processInputsMetadata(eventFragment: ethers.utils.EventFragment) {
}
export function filterLog(logs: Log[]) {
    const results: any[] = [];
    for (const log of logs) {
        const fragments = EVENT_TOPIC_TO_FRAGMENT[log.topics[0]];
        if (!fragments) continue;

        try {
            // if more than one fragment, figure out if event is erc20 vs erc721 (erc721 will have 4 topics for Transfer/Approval)
            let fragment = fragments[0];
            if (fragments.length > 1 && log.topics.length === 4) {
                fragment = fragments[1];
            }

            results.push({
                name: fragment.name,
                address: log.address,
                args: decodeEventLog(fragment, log.data, log.topics),
            });
        } catch (e) {
            console.log("error decoding log", e);
        }
    }
    return results;
}
export function decodeEventLog(
    eventFragment: ethers.utils.EventFragment,
    data: ethers.utils.BytesLike,
    topics: ReadonlyArray<string>
): ethers.utils.Result {

    topics = topics.slice(1);

    let { indexed, nonIndexed, dynamic } =
        FRAGMENT_TO_INPUTS_METADATA.get(eventFragment)!;

    let resultIndexed =
        topics != null
            ? abiCoder.decode(indexed, ethers.utils.concat(topics))
            : null;
    let resultNonIndexed = abiCoder.decode(nonIndexed, data, true);

    let result: Array<any> & { [key: string]: any } = [];
    let namedResult: Array<any> & { [key: string]: any } = [];
    let nonIndexedIndex = 0,
        indexedIndex = 0;
    eventFragment.inputs.forEach((param, index) => {
        if (param.indexed) {
            if (resultIndexed == null) {
                result[index] = new ethers.utils.Indexed({
                    _isIndexed: true,
                    hash: "",
                });
            } else if (dynamic[index]) {
                result[index] = new ethers.utils.Indexed({
                    _isIndexed: true,
                    hash: resultIndexed[indexedIndex++],
                });
            } else {
                try {
                    result[index] = resultIndexed[indexedIndex++];
                } catch (error) {
                    result[index] = error;
                }
            }
        } else {
            try {
                result[index] = resultNonIndexed[nonIndexedIndex++];
            } catch (error) {
                result[index] = error;
            }
        }

        // Add the keyword argument if named and safe
        if (param.name && result[param.name] == null) {
            const value = result[index];

            // Make error named values throw on access
            if (!(value instanceof Error)) {
                namedResult[param.name] = value;
            }
        }
    });

    return namedResult; //Object.freeze(result);
}