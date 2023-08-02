export const MINT_EVENT_ABI: string = "event Transfer(address(0), account, amount)";
export const TRANSFER_EVENT: string = "event Transfer(address indexed from, address indexed to, uint256 value)";
export const APPROVAL_EVENT_ABI: string = "event Approval(address indexed owner, address indexed spender, uint256 value)";
export const GAS_TOKEN_ABI: string = "event Mint(address indexed minter, uint256 value)";
export const GAS_TOKEN: string = "0x0000000000004946c0e9F43F4Dee607b0eF1fA1c";
export const MINT_FUNCTION: string = "function mint(uint256 amount)";
export const MINT_EVENT: string = "event Mint(address indexed minter, uint256 value)";
export type providerParamsType = string;
export const providerParams: providerParamsType = MINT_FUNCTION;
export const BEP20_APPROVE_FUNCTION_SIG = "function approve(address spender, uint256 amount)";
export const BEP20_INCREASE_ALLOWANCE_FUNCTION_SIG = "function increaseAllowance(address spender, uint256 amount)";
export const ERC721_APPROVAL_EVENT_ABI = `
event Approval(
  address indexed owner,
  address indexed approved,
  uint256 indexed tokenId
)`;
export const ERC721_APPROVAL_FOR_ALL_EVENT_ABI = `
event ApprovalForAll(
  address indexed owner,
  address indexed operator,
  bool approved
)`;