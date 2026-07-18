-include .env
VAULT   := $(shell jq -r .vault deployments/42161.json)
MANAGER := $(shell jq -r .manager deployments/42161.json)
ADAPTER := $(shell jq -r .adapter deployments/42161.json)
RPC     := --rpc-url $(ARBITRUM_RPC_URL)
ACCT    := --account $(KEYSTORE_ACCOUNT)

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
