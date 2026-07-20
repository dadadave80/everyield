// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/// @title MockERC20
/// @notice Minimal ERC-20 test double standing in for real USDC, which doesn't exist on the local
///         EVM. The pinned forge-std release no longer ships `forge-std/mocks/MockERC20.sol`, so
///         this local double reproduces just the surface `DeployEveryieldTest` needs: metadata via
///         a two-step `initialize` (mirroring the removed forge-std mock's API) plus the plain
///         ERC-20 mutators the vault's ERC-4626 facet probes during initialization.
contract MockERC20 {
    string public name;
    string public symbol;
    uint8 public decimals;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function initialize(string memory name_, string memory symbol_, uint8 decimals_) public {
        name = name_;
        symbol = symbol_;
        decimals = decimals_;
    }

    function mint(address to, uint256 amount) public {
        totalSupply += amount;
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) public returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) public returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) allowance[from][msg.sender] = allowed - amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}
