# Unususal Gas Token Mint Detection Bot

## Description
This bot is designed to monitor transactions on the blockchain for anomalous gas token minting, which is often associated with fraudulent activity. Gas tokens are a type of ERC-20 token that can be used to pay for transaction fees on the blockchain (Bsc, Polygon) When a user mints gas tokens, they pay the transaction fee and receive gas tokens in return. These gas tokens can then be used to pay for transaction fees on future transactions, potentially reducing the amount of Ether needed to perform transactions.

To detect these activities, the bot looks for transactions that involve excessive gas fees and gas token minting. These transactions are often associated with unknown approval transactions, which do not have a logo or any other identifying information. The bot filters out these transactions and calculates the gas price for each gas token minting event. It then compares the gas price to a rolling average of gas prices for the past 5000 transactions and flags any transactions that have a gas price that is more than 10 standard deviations above the rolling average.

If a suspicious gas token minting event is detected, the bot creates a Finding object that represents the anomaly. The Finding includes metadata such as the to address and value of the minted tokens, and labels the to address with a high-gas-token-mint tag. This information can be used by users or other monitoring tools to investigate the transaction and take appropriate action.

## Supported Chains

- Binance Smart Chain
- Polygon


## Alerts

Describe each of the type of alerts fired by this agent 


- Name: GAS-TOKEN-ANOMALOUS-MINT 
  - Fired when suspicious minting of gas token is found on the supported blockchains
  - Severity is always set to `high` for this alert
  - Type is always set to `info`  for this alert
  - Metadata 
    - `to` - address that initiated the transaction
    - `contractAddress` - address of the contract
    - `value` - gas fee of the transaction
  - Label 
    - `entityType` - `address` or `contract`
    - `entity` - address of the contract
    - `label` - `sus-gas-token-scam`
    - `confidence` for the address 

## Test Data

The bot behaviour can be verified with supplied unit tests