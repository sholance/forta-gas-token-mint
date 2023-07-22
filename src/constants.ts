export const MINT: string = "function mint(uint256 value) external returns (bool)";
export const FREE: string = "function free(uint256 value) external returns (bool)";
export const TRANSFER: string = "function transfer(address to, uint256 value) public returns (bool)";
export const APPROVE: string = "function approve(address spender, uint256 amount) public override returns (bool)";
export const TRANSFER_FROM: string = "function transferFrom(address from, address to, uint256 value) public returns (bool)";
export const MINT_EVENT_ABI: string = "event Transfer(address(0), account, amount)";
export const TRANSFER_EVENT_ABI: string = "event Transfer(address indexed from, address indexed to, uint256 value)";
export const APPROVAL_EVENT_ABI: string = "event Approval(address indexed owner, address indexed spender, uint256 value)";
export const BURN_EVENT_ABI: string = "event Transfer(account, address(0), amount)";
export const GAS_TOKEN: string = "0x0000000000004946c0e9F43F4Dee607b0eF1fA1c";
export const MINT_THRESHOLD: string = "500"