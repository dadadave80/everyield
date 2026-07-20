# Security Policy

Everyield is **unaudited hackathon demo software**, built for the Encode UXMAXX Hackathon. Please read this
before interacting with the live contracts.

## Use at your own risk

- The smart contracts and frontend have **not been audited**. Treat everything here as experimental.
- The live diamonds on Arbitrum One hold **intentionally small, disposable amounts** for demonstration only.
- **Do not deposit funds you cannot afford to lose.** This is a proof of concept, not a production savings
  product.

## Known limitations

There is a documented share-pricing composition bug in Lattice's `ERC4626Lib` that Everyield engineers
around, **fail-closed**, on both the contract and the app side. See the
[constraints section of the README](README.md#what-our-fork-test-caught--in-our-own-framework) for the full
write-up (idle-only pricing guard, full-NAV display pricing, interaction-window guard). This is a known,
handled issue — not a vulnerability report target.

## Reporting a vulnerability

If you find a security issue **not** already covered above, please report it privately:

- **Preferred:** open a private
  [GitHub Security Advisory](https://github.com/dadadave80/everyield/security/advisories/new) on this repo.
- **Or email:** developer@randao.net

Please do **not** open a public issue for anything exploitable. Include enough detail to reproduce (affected
contract/file, transaction or steps, and impact).

### What to expect

- **No bounty program.** This is an unpaid hackathon project; there is no reward for reports.
- **Best-effort response.** We aim to acknowledge reports as soon as reasonably possible, but there is no
  guaranteed response time.

## Upstream framework

Everyield builds on the [**Lattice**](https://github.com/dadadave80/lattice) Diamond framework, consumed as a
dependency. Vulnerabilities in the framework itself (e.g. the facets, `*Lib`, or diamond assembly) should be
reported to the [Lattice repository](https://github.com/dadadave80/lattice), not here — though a heads-up via
the channels above is welcome if it affects Everyield's live deployment.
