# Scam Approval Detection Bot

## Description

This bot monitors transactions on the blockchain for scam approvals. The transactions are usually with excessive gas fees and most likely do not have a logo. These unknown approval transactions are from a new scam where scammers use gas tokens to take from user funds when victims revoke these "fake approvals" through high gas fees.

## Supported Chains

- Avalanche
- Binance Smart Chain
- Polygon
- Fantom
- Arbitrum
- Optimism


## Alerts

Describe each of the type of alerts fired by this agent

- Name: SCAM-APPROVAL-TRANSACTION
  - Fired when a scam approval transaction is detected in the transaction history
  - Severity is always set to `high`
  - Type is always set to `exploit`
  - Metadata
    - `sender` -  address that initiated the transaction
    - `transactionHash` - hash of the transaction
    - `contractAddress` - address of the contract
    - `token` - token symbol
    - `gasFee` - gas fee of the transaction
    - `deployer` - address that deployed the contract
  - Label
    - `entityType` - `address` or `transaction`
    - `entity` - address or transaction hash
    - `label` - `unknown-approval-transaction`
    - `confidence` - for the address and transaction

- Name: GAS-TOKEN-SCAM
  - Fired when two or more scam approval transactions are detected from the same address and gas tokens were used in these transactions
  - Severity is always set to `critical`
  - Type is always set to `fraudulent`
  - Metadata 
    - `sender` - address that initiated the transaction
    - `contractAddress` - address of the contract
    - `gasFee` - gas fee of the transaction
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