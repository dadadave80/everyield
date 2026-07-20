# Contributing to Everyield

Thanks for taking a look. Everyield is a hackathon project, so this guide is short and practical.

## Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) (`forge`, `cast`, `anvil`)
- [Bun](https://bun.sh) (for the `app/` frontend)

## Setup

The Solidity dependencies (`forge-std`, `lattice`) are git submodules, so clone recursively:

```bash
git clone --recursive https://github.com/dadadave80/everyield.git
cd everyield
```

Already cloned without `--recursive`? Pull the submodules in:

```bash
git submodule update --init --recursive
```

Then install the frontend dependencies:

```bash
cd app
bun install
```

## Tests

**Contracts (Foundry):**

```bash
# assembly + smoke suite (no network needed)
forge test --match-contract DeployEveryieldTest

# full suite, including the Arbitrum-fork round trip
# (the fork suite needs an RPC endpoint)
export ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc   # or your own provider
forge test
```

The fork suite (`EveryieldForkTest`) is skipped/failed without `ARBITRUM_RPC_URL` set.

**Frontend (Bun):**

```bash
cd app
bun test
```

## Conventions

- **[Conventional Commits](https://www.conventionalcommits.org/)** — e.g. `feat:`, `fix:`, `docs:`,
  `chore:`, `test:`.
- **GPG-signed commits.** Please sign your commits (`git commit -S`); verified history is expected.
- Keep changes focused and match the surrounding code style. Run `forge fmt` for Solidity and `bun run lint`
  in `app/` before opening a PR.

## Pull requests

- Base your PR on **`main`**.
- Describe what changed and why. If it touches the live vault behavior, note it explicitly.
- Make sure the relevant tests above pass locally.

By contributing, you agree your contributions are licensed under the repository's
[MIT License](LICENSE). Please also review our
[Code of Conduct](CODE_OF_CONDUCT.md).
