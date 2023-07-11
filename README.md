# Soft Rug Pull Detection Agent

## Description

This bot monitors transactions on the blockchain for unknown approval transactions in the transaction history of a given address. These unknown approval transactions could be part of a new scam where scammers use gas tokens to steal money when victims revoke these "fake approvals".

## Supported Chains

- Avalanche
- Binance Smart Chain
- Polygon
- Fantom
- Arbitrum
- Optimism


## Alerts

Describe each of the type of alerts fired by this agent

- Name: UNKNOWN-APPROVAL-TRANSACTION
  - Fired when an unknown approval transaction is detected in the transaction history of a given address
  - Severity is always set to `high`
  - Type is always set to `exploit`
  - Metadata
    - `sender` -  address that initiated the transaction
    - `transactionHash` - hash of the transaction
    - `contractAddress` - address of the contract
    - `token` - token symbol
    - `deployer` - address that deployed the contract
  - Label
    - `entityType` - `address` or `transaction`
    - `entity` - address or transaction hash
    - `label` - `unknown-approval-transaction`
    - `confidence` - for the address and transaction

- Name: GAS-TOKEN-SCAM
  - Fired when two or more unknown approval transactions are detected from the same address and gas tokens were used in these transactions
  - Severity is always set to `critical`
  - Type is always set to `fraudulent`
  - Metadata 
    - `sender` - address that initiated the transaction
    - `contractAddress` - address of the contract
    - `token` - token symbol
    - `deployer` - address that deployed the contract
  - Label 
    - `entityType` - `address`
    - `entity` - address
    - `label` - `gas-token-scam`
    - `confidence` for the address

## Test Data

The agent behaviour can be verified with the following tokens:


TODO: Add more test data