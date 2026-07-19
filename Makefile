-include .env
# Default for older .env files that predate the rehearsal var
ARBITRUM_SEPOLIA_RPC_URL ?= https://sepolia-rollup.arbitrum.io/rpc
VAULT   := $(shell jq -r .vault deployments/42161.json 2>/dev/null)
MANAGER := $(shell jq -r .manager deployments/42161.json 2>/dev/null)
ADAPTER := $(shell jq -r .adapter deployments/42161.json 2>/dev/null)
RPC     := --rpc-url $(ARBITRUM_RPC_URL)
ACCT    := --account $(KEYSTORE_ACCOUNT)

# Task 4a rehearsal targets (Arbitrum Sepolia; cast-verified 2026-07-18 via aave-address-book v4.60.0)
TESTNET_USDC     := 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d
TESTNET_PROVIDER := 0xB25a5D144626a0D488e52AE717A051a2E9997076
# RESUME=1 appends --resume (re-run after a partial broadcast / missed verification — never redeploy)
RESUME_FLAG := $(if $(RESUME),--resume,)

.PHONY: crank exit status deploy-testnet deploy-mainnet deploy-local verify-testnet verify-mainnet

verify-testnet: ## add Etherscan-family (Arbiscan) verification on top of Sourcify — needs ETHERSCAN_API_KEY in .env
	forge script script/DeployEveryield.s.sol \
	  --sig "runCustom(address,address)" $(TESTNET_USDC) $(TESTNET_PROVIDER) \
	  --rpc-url $(ARBITRUM_SEPOLIA_RPC_URL) $(ACCT) \
	  --resume --verify --verifier etherscan --etherscan-api-key $(ETHERSCAN_API_KEY)

verify-mainnet: ## same, for the Arbitrum One deployment
	forge script script/DeployEveryield.s.sol \
	  --sig "run()" \
	  --rpc-url $(ARBITRUM_RPC_URL) $(ACCT) \
	  --resume --verify --verifier etherscan --etherscan-api-key $(ETHERSCAN_API_KEY)

deploy-testnet: ## dress rehearsal: Arbitrum Sepolia + Sourcify (deployer = broadcast sender)
	forge script script/DeployEveryield.s.sol \
	  --sig "runCustom(address,address)" $(TESTNET_USDC) $(TESTNET_PROVIDER) \
	  --rpc-url $(ARBITRUM_SEPOLIA_RPC_URL) $(ACCT) \
	  --broadcast --verify --verifier sourcify $(RESUME_FLAG)

deploy-mainnet: ## the real thing: Arbitrum One + Sourcify (deployer = broadcast sender)
	forge script script/DeployEveryield.s.sol \
	  --sig "run()" \
	  --rpc-url $(ARBITRUM_RPC_URL) $(ACCT) \
	  --broadcast --verify --verifier sourcify $(RESUME_FLAG)

deploy-local: ## broadcast rehearsal against a local anvil fork (no verification)
	forge script script/DeployEveryield.s.sol \
	  --sig "run()" \
	  --rpc-url http://127.0.0.1:8545 \
	  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
	  --broadcast

crank: ## rebalance to 80/20 then supply adapter idle into Aave
	cast send $(MANAGER) "rebalance()" $(RPC) $(ACCT)
	cast send $(MANAGER) "crankDeploy(address)" $(ADAPTER) $(RPC) $(ACCT)

exit: ## recall everything from Aave to the vault (pre-full-withdraw)
	cast send $(MANAGER) "updateStrategyTarget(address,uint16)" $(ADAPTER) 0 $(RPC) $(ACCT)
	cast send $(MANAGER) "rebalance()" $(RPC) $(ACCT)
	cast send $(MANAGER) "updateStrategyTarget(address,uint16)" $(ADAPTER) 8000 $(RPC) $(ACCT)

status:
	@echo "totalAssets:"; cast call $(VAULT) "totalAssets()(uint256)" $(RPC)
	@echo "idleAssets:";  cast call $(VAULT) "idleAssets()(uint256)" $(RPC)
	@echo "inAave:";      cast call $(ADAPTER) "totalAssetsManaged()(uint256)" $(RPC)
