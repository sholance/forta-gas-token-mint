# Unususal Gas Token Mint Detection Bot

## Description

This bot monitors transactions on the blockchain for anomalous gas token minting. The transactions are usually with excessive gas fees and most likely do not have a logo. These unknown approval transactions are from a new scam where scammers use gas tokens to take from user funds when victims revoke these "fake approvals" through high gas fees.

## Supported Chains

- Binance Smart Chain
- Polygon


## Alerts

Describe each of the type of alerts fired by this agent


- Name: GAS-TOKEN-ANOMALOUS-MINT
  - Fired when suspicious minting of gas token is found
  - Severity is always set to `high`
  - Type is always set to `info`
  - Metadata 
    - `to` - address that initiated the transaction
    - `contractAddress` - address of the contract
    - `value` - gas fee of the transaction
  - Label 
    - `entityType` - `address`
    - `entity` - address
    - `label` - `gas-token-scam`
    - `confidence` for the address

## Test Data

The agent behaviour can be verified with the following tokens:


TODO: Add more test data
