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
# Deploy targets need DEPLOYER=0x… (get it with: make deployer). Guard fails loudly if unset.
define require_deployer
	@test -n "$(DEPLOYER)" || { echo "Set DEPLOYER=0x… (run: make deployer)"; exit 1; }
endef

.PHONY: crank exit status deployer deploy-testnet deploy-mainnet

deployer: ## print the keystore's address (interactive password prompt)
	cast wallet address $(ACCT)

deploy-testnet: ## dress rehearsal: Arbitrum Sepolia + Sourcify (DEPLOYER=0x… required)
	$(require_deployer)
	forge script script/DeployEveryield.s.sol \
	  --sig "runCustom(address,address,address)" $(DEPLOYER) $(TESTNET_USDC) $(TESTNET_PROVIDER) \
	  --rpc-url $(ARBITRUM_SEPOLIA_RPC_URL) $(ACCT) --sender $(DEPLOYER) \
	  --broadcast --verify --verifier sourcify $(RESUME_FLAG)

deploy-mainnet: ## the real thing: Arbitrum One + Sourcify (DEPLOYER=0x… required)
	$(require_deployer)
	forge script script/DeployEveryield.s.sol \
	  --sig "run(address)" $(DEPLOYER) \
	  --rpc-url $(ARBITRUM_RPC_URL) $(ACCT) --sender $(DEPLOYER) \
	  --broadcast --verify --verifier sourcify $(RESUME_FLAG)

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
