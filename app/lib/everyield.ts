import { Contract, Interface, JsonRpcProvider, formatUnits, parseUnits } from "ethers";
import { CHAIN_ID, SUPPORTED_TOKEN_TYPE, type UniversalAccount } from "@particle-network/universal-account-sdk";
import { AAVE_POOL_PROVIDER, ARBITRUM_RPC, ARBITRUM_USDC, VAULT } from "./addresses";

const erc20 = new Interface(["function approve(address spender, uint256 value) returns (bool)"]);
export const vaultAbi = new Interface([
  "function deposit(uint256 assets, address receiver) returns (uint256)",
  "function redeem(uint256 shares, address receiver, address owner) returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function idleAssets() view returns (uint256)",
  "function totalAssets() view returns (uint256)",
]);
// PRICING RULE (fork-test finding, reviewer-confirmed): NEVER price positions via
// convertToAssets/previewRedeem — those selectors bind library-internally to idle-only
// totalAssets. Only the external totalAssets() reports full NAV. Position value is
// shares * totalAssets() / totalSupply().
const providerAbi = new Interface(["function getPool() view returns (address)"]);
const poolAbi = new Interface([
  "function getReserveData(address) view returns ((uint256,uint128,uint128,uint128,uint128,uint128,uint40,uint16,address,address,address,address,uint128,uint128,uint128))",
]);

const rpc = new JsonRpcProvider(ARBITRUM_RPC);

export function encodeDeposit(amountUsdc: string, owner: string) {
  const amount6 = parseUnits(amountUsdc, 6);
  return [
    { to: ARBITRUM_USDC, data: erc20.encodeFunctionData("approve", [VAULT, amount6]) },
    { to: VAULT, data: vaultAbi.encodeFunctionData("deposit", [amount6, owner]) },
  ];
}

export async function createDepositTx(ua: UniversalAccount, amountUsdc: string, owner: string) {
  return ua.createUniversalTransaction({
    chainId: CHAIN_ID.ARBITRUM_MAINNET_ONE,
    expectTokens: [{ type: SUPPORTED_TOKEN_TYPE.USDC, amount: amountUsdc }],
    transactions: encodeDeposit(amountUsdc, owner),
  });
}

export async function createWithdrawTx(ua: UniversalAccount, shares: bigint, owner: string) {
  return ua.createUniversalTransaction({
    chainId: CHAIN_ID.ARBITRUM_MAINNET_ONE,
    // No inbound asset needed to redeem; gas comes from the unified balance by
    // default. IExpectToken[] permits an empty array (no minimum-length tuple), so
    // this is left as []. If a live run ever rejects it at runtime, fall back to
    // the documented dust pattern: [{ type: SUPPORTED_TOKEN_TYPE.ETH, amount: "0.0000001" }]
    expectTokens: [],
    transactions: [{ to: VAULT, data: vaultAbi.encodeFunctionData("redeem", [shares, owner, owner]) }],
  });
}

export type Position = Awaited<ReturnType<typeof readPosition>>;

export async function readPosition(owner: string) {
  const vault = new Contract(VAULT, vaultAbi, rpc);
  // ethers' dynamic Contract methods are typed `any`; without this explicit tuple
  // annotation, TS resolves the `any * any` below to `number`, not `bigint`.
  const [shares, idleAssets, totalAssets, totalSupply] = (await Promise.all([
    vault.balanceOf(owner),
    vault.idleAssets(),
    vault.totalAssets(),
    vault.totalSupply(),
  ])) as [bigint, bigint, bigint, bigint];
  // Full-NAV pricing (see PRICING RULE above); fullyIdle gates deposit/withdraw availability.
  const usdcValue: bigint = totalSupply === 0n ? 0n : (shares * totalAssets) / totalSupply;
  const fullyIdle = idleAssets >= totalAssets;
  // totalAssets/totalSupply are surfaced so a partial-withdraw amount can be
  // converted USD→shares (amount6 * totalSupply / totalAssets) without re-reading.
  return { shares, usdcValue, idleAssets, fullyIdle, totalAssets, totalSupply, display: formatUnits(usdcValue, 6) };
}

export async function readApy(): Promise<number> {
  const provider = new Contract(AAVE_POOL_PROVIDER, providerAbi, rpc);
  const pool = new Contract(await provider.getPool(), poolAbi, rpc);
  const data = await pool.getReserveData(ARBITRUM_USDC);
  const liquidityRateRay: bigint = data[2]; // currentLiquidityRate (ray, 1e27) — verified via cast call
  const apr = Number(liquidityRateRay) / 1e27;
  return (Math.exp(apr) - 1) * 100; // continuous-compounding APY, in %
}
