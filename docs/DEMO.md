# Everyield — demo video script (2–3 min)

Target: 2:30. Tone: calm, confident, product-first. Let the interface carry the story; the chain machinery is
the payoff, not the pitch. Narration lines are in quotes; screen actions are in **bold**.

---

## Pre-flight checklist (do this before recording)

- [ ] **App running** — either `https://everyield.vercel.app` (prod) or `cd app && bun dev` on `localhost:3000`. Decide which
      before you start; prod is safer on camera.
- [ ] **Funds present** — the Universal Account holds USDC on a chain *other than Arbitrum* (Base is ideal) so the
      deposit is a genuine cross-chain move. Keep enough for the ~$0.36 all-in fee plus the $2 principal.
- [ ] **Vault fully idle** — Save/Withdraw only unlock when the vault is idle. If a prior crank left funds in
      Aave, run `make exit KEYSTORE=<name>` and wait for the next 15s poll to re-enable the buttons.
- [ ] **Console clean** — open DevTools once, confirm no red errors, then close it. Nothing should be on screen
      during the take.
- [ ] **Incognito / fresh profile** — so the login flow starts from a clean, logged-out state.
- [ ] **Theme decision** — pick light or dark up front and use the toggle to lock it before recording; don't
      switch mid-take. (Dark reads well for the balance hero.)
- [ ] Have an **Arbiscan** tab pre-opened to the vault address for the closing proof shot.

---

## Shot list

### 1 — The one-liner (0:00–0:12)
**Landing page (`LandingHero`), logged out.**
> "This is Everyield — a savings account that doesn't know what a chain is. No networks to pick, no bridges, no
> gas token to hold. Watch."

### 2 — Email login (0:12–0:28)
**Click the login button → choose email (or Google) → complete the Privy flow.**
> "I log in with an email. Behind the scenes, Privy gives me an ordinary wallet — and under EIP-7702, that same
> key signs one authorization that upgrades it into a smart account."
**Land on the dashboard; the wordmark, account pill, and theme toggle appear in the header.**

### 3 — One balance (0:28–0:45)
**The hero balance counts up: "Total balance", big number, "Everything you own, one number."**
> "Here's everything I own across chains, as a single number. I never told it which network my money is on — the
> Particle Universal Account just aggregates it."
**Scroll to the `ChainBreakdown` money-map.**
> "And here's where that money actually lives — a few different chains, one balance to me."

### 4 — Save, with the fee shown first (0:45–1:15)
**In "Add to savings", tap a quick chip or type `2`. The `FeePreview` resolves under the input.**
> "I want to save two dollars. Before I sign anything, Everyield shows me the all-in cost — quoted up front,
> every time."
**Point at the fee line (~$0.36).**
> "Thirty-six cents, all in. That's the cross-chain routing plus gas — and I'll be charged exactly that."
**Click **Save $2.00**.**

### 5 — Signature (1:15–1:25)
**The Privy signature prompt appears; approve it.**
> "One signature. The embedded wallet signs — no seed phrase, no network switch."

### 6 — The stage rail (1:25–1:50)
**The `ActivityFeed` row animates through the rail: Signed → Routing funds → Executing → Confirmed.**
> "Now the Universal Account moves the value from Base to Arbitrum and lands it in the vault. The contracts never
> bridge — Particle handles the whole cross-chain leg. Signed… routing… executing…"
**Wait for **Confirmed**.**
> "Confirmed."

> **Fallback:** if the live cross-chain leg is slow on camera, don't wait on the spinner. Cut to the
> already-confirmed activity row (or the pre-opened Arbiscan tab) and narrate: "This one already settled a moment
> ago — here it is confirmed on-chain." Keep moving; never sit on a loading state.

### 7 — Operator crank, briefly (1:50–2:05)
**Cut to a terminal. Run `make crank KEYSTORE=<name>`.**
> "One operator step rebalances the vault — eighty percent into Aave, twenty percent kept idle as a buffer — and
> supplies it into Aave V3. In production this is a keeper on Chainlink Automation; here it's one command."
**Show the split land (or cut back to the app).**

### 8 — Earning (2:05–2:20)
**Back in the app, "Your savings" shows the position with the `ApyBadge` reading e.g. "4.xx% a year".**
> "And now it's earning — live Aave V3 yield, priced against the vault's full value, updating around the clock."

### 9 — Partial withdraw (2:20–2:40)
**Tap **Withdraw**, type `1`, let the `FeePreview` resolve, tap **Confirm withdrawal**, approve.**
> "Withdrawals are partial or full. I'll pull one dollar back — same fee-first flow, exact share math. My savings
> update instantly."

### 10 — On-chain proof (2:40–2:55)
**Switch to the Arbiscan tab on the vault address; show the deposit + withdraw transactions.**
> "And every cent of this is verifiable on-chain against one vault address on Arbitrum One. That's Everyield — one
> balance, one Save button, real yield. Thanks for watching."

---

## Notes for the editor

- Keep the fee line on screen a beat longer than feels natural — the "quoted up front, charged as quoted" claim
  is a core differentiator.
- The operator/terminal shot (step 7) should read as *infrastructure*, not a user step — label it "operator" on
  screen if possible. The app itself surfaces this: the optimizing notice shows a `make exit` operator chip.
- If total runtime is tight, compress steps 3 and 7 rather than the fee preview (4) or the proof shot (10).
