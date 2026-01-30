# EIP-8141 Context

Generated: 2026-01-30

## Raw EIP Content
Source: https://github.com/ethereum/EIPs/blob/master/EIPS/eip-8141.md
```
---
eip: 8141
title: Frame Transaction
description: Add frame abstraction for transaction validation, execution, and gas payment
author: Vitalik Buterin (@vbuterin), lightclient (@lightclient), Felix Lange (@fjl), Yoav Weiss (@yoavw), Alex Forshtat (@forshtat), Dror Tirosh (@drortirosh), Shahaf Nacson (@shahafn)
discussions-to: https://ethereum-magicians.org/t/frame-transaction/27617
status: Draft
type: Standards Track
category: Core
created: 2026-01-29
requires: 2718, 4844
---

## Abstract

Add a new transaction whose validity and gas payment can be defined abstractly. Instead of relying solely on a single ECDSA signature, accounts may freely define and interpret their signature scheme using any cryptographic system.

## Motivation

This new transaction provides a native off-ramp from the elliptic curve based cryptographic system used to authenticate transactions today, to post-quantum (PQ) secure systems.

In doing so, it realizes the original vision of account abstraction: unlinking accounts from a prescribed ECDSA key and support alternative fee payment schemes. The assumption of an account simply becomes an address with code. It leverages the EVM to support arbitrary *user-defined* definitions of validation and gas payment.

## Specification

### Constants

| Name                      | Value                                   |
| ------------------------- | --------------------------------------- |
| `FRAME_TX_TYPE`           | `0x06`                                  |
| `FRAME_TX_INTRINSIC_COST` | `15000`                                 |
| `ENTRY_POINT`             | `address(0xaa)`                         |
| `MAX_FRAMES`              | `10^3`                                  |

### Opcodes

| Name           | Value  |
| -------------- | ------ |
| `APPROVE`      | `0xaa` |
| `TXPARAMLOAD`  | `0xb0` |
| `TXPARAMSIZE`  | `0xb1` |
| `TXPARAMCOPY`  | `0xb2` |

### New Transaction Type

A new [EIP-2718](./eip-2718) transaction with type `FRAME_TX_TYPE` is introduced. Transactions of this type are referred to as "Frame transactions".

The payload is defined as the RLP serialization of the following:

[chain_id, nonce, sender, frames, max_priority_fee_per_gas, max_fee_per_gas, max_fee_per_blob_gas, blob_versioned_hashes]

frames = [[mode, target, gas_limit, data], ...]

#### Modes

There are three modes:

| Mode | Name           | Summary                                                   |
| ---- | -------------- | --------------------------------------------------------- |
|    0 | `DEFAULT`      | Execute frame as `ENTRY_POINT`                            |
|    1 | `VERIFY`       | Frame identifies as transaction validation                |
|    2 | `SENDER`       | Execute frame as `sender`                                 |

- DEFAULT Mode: Frame executes as regular call where the caller address is `ENTRY_POINT`.
- VERIFY Mode: Identifies the frame as a validation frame. Its purpose is to *verify* that a sender and/or payer authorized the transaction. Must terminate with `APPROVE`.
- SENDER Mode: Frame executes as regular call where the caller address is `sender`. This mode effectively acts on behalf of the transaction sender.

### New Opcodes

- `APPROVE` (0xaa): Like `RETURN` but with a scope operand for execution/payment approval
- `TXPARAM*`: Environment access opcodes for transaction introspection
```

## Commit History
Source: https://github.com/ethereum/EIPs/commits/master/EIPS/eip-8141.md
```
{sha: "187d1ce", date: "2026-01-29", message: "Update EIP-8141: Fix status field number"}
{sha: "723c9ca", date: "2026-01-29", message: "Update EIP-8141: fix typos"}
{sha: "6f46a8c", date: "2026-01-29", message: "Add EIP: Frame Transaction"}
```

## Original PR Discussion
Source: https://github.com/ethereum/EIPs/pull/11202

### PR Body
(Empty body)

### Issue Comments
- **eth-bot** (2026-01-29): All reviewers have approved.
- **github-actions** (2026-01-29): The commit 9df7fe661fd9e11d23435ea57f2eb5260dcf7039 (as a parent of c83b98513bdef499f49ff01577eba64ba4071fe5) contains errors. Please inspect the Run Summary for details.

### Review Comments
- **abcoathup** (2026-01-29): Assigning next sequential EIP/ERC/RIP number. Numbers are assigned by editors & associates. Please also update the filename.
- **abcoathup** (2026-01-29): Added assigned number to discussions-to URL

### Reviews
- **lightclient**: APPROVED
- **eth-bot**: APPROVED - All Reviewers Have Approved; Performing Automatic Merge...

## Headliner Proposal
Source: https://ethereum-magicians.org/t/hegota-headliner-proposal-frame-transaction/27618

### Posts
**matt** (2026-01-29):
Frame Transaction EIP: https://github.com/ethereum/EIPs/pull/11202

## Summary (ELI5)
A new transaction type where validation and gas payment are defined by smart contract code instead of enshrined ECDSA signatures. This enables:
- **Post-quantum security:** Accounts can use any signature scheme
- **Native account abstraction:** Flexible wallets with social recovery, multi-sig, spending limits
- **Gas sponsorship:** Someone else can pay your fees natively

**Beneficiaries:** End users (better UX and safety), wallet developers, the network (PQ migration path)

## Champion
Felix Lange (@fjl) and lightclient (@lightclient)

## Justification

### Why This Matters
| Benefit | Rationale |
|---------|-----------|
| PQ security | ECDSA will break; users can migrate to quantum-resistant signatures at their pace |
| Native AA | More efficient than ERC-4337; eliminates intermediaries for mempool/bundler infrastructure. Better at "walk away" test |
| Gas flexibility | Native sponsorship support; ERC-20 gas payments without trusted intermediaries |

### Why Now
- Quantum threat requires proactive migration (10+ year timeline, but migration is slow).
- ERC-4337 validated demand and design patterns. Time to enshrine.
- EIP-7702 already changed `ORIGIN` semantics, reducing this proposal's disruption.

### Why This Approach
| Alternative | Limitation |
|-------------|------------|
| ERC-4337 | Separate mempool, bundlers, higher overhead |
| EIP-7701 | Overly specific about particular flows, not easy to generalize in client impl |
| EIP-7702 | Useful but solves different problem; not PQ |
| PQ tx type | Simpler, but there may be many PQ schemes that are desirable. And, it doesn't allow us to achieve other long term goals, like key rotation. |

## Stakeholder Impact

### Positive
- **Users:** Better wallet UX, flexible security, gas sponsorship
- **Wallet/dApp devs:** Native AA infrastructure, easier onboarding
- **ERC-4337 ecosystem:** Natural migration path

### Negative
| Impact | Mitigation |
|--------|------------|
| Node DoS vectors from arbitrary validation | ERC-7562-style opcode restrictions; `MAX_VALIDATION_GAS` |
| `ORIGIN` behavior change | Already precedented by EIP-7702; pattern was discouraged |

## Technical Readiness
| Aspect | Status |
|--------|--------|
| Transaction format | Complete |
| New opcodes (APPROVE, TXPARAM*) | Complete |
| Gas accounting | Complete |
| Mempool rules | Defined in ERC-7562 |
| Reference implementation | Not started |
| Test vectors | Not started |

## Security & Open Questions

### Known Risks
1. **Mempool DoS:** Mass invalidation via shared state. This is mitigated by validation restrictions from ERC-7562.

### Open Questions
1. Paymaster support: paymasters are established under ERC-4337. While this EIP aims to be compatible with them via same mempool rules, it is open question to see that materialize. It will require working through the design with existing bundlers.

---

**oxshaman** (2026-01-29):
Great read!

One question - does this imply that the plan is to continue down the path of 4337-Bundler-Style restrictions to state access. As I see the DoS mitigation is approached via ERC-7562 and `MAX_VALIDATION_GAS`.

Is full state access being considered anymore or is it out of scope?

---

**matt** (2026-01-29):
Thank you!

I would say it's important to make the distinction between *what does the protocol allow* and *what is allowed in public transaction pool*. Our aim is to make the protocol maximally flexible, but start small and carefully expand what the public tx pool will allow.

Concretely to your question: full state access before the payer is approved in this proposal, however, you will need to find a builder who will include such a transaction. Our goal is to support self-sponsored transactions in the beginning and over time allow sponsor transactions (or other variants that gain popularity).

---

**vbuterin** (2026-01-30):
4337 already supports full state access via the paymaster mechanism.

A paymaster also serves as a de-facto custom mempool acceptance rule, and the protocol acts as a sort of "meta-mempool-acceptance-rule" where anyone can stake ETH to add their mempool acceptance rule to the list, and if too many transactions pass that rule but do not get included onchain, then it gets throttled and then delisted (as a subjective decision by mempool nodes).

Since 8141 is a modification on 7701, and 7701 is itself an onchain version of 4337, this design can be applied as-is to make a mempool for 8141 transactions.

## Call Transcript
Source: acde/229 - public/artifacts/acde/2026-01-29_229/transcript_corrected.vtt

### Relevant Excerpts

**Ansgar Dietrichs** (01:10:43):
And keep the discussion alive. For today, I would then move on to the second presentation, because… so we can get through all three. So thank you, Yannick. And then next up will be, frame transactions, proposed by Matt and Felix, or I think those two wanted to give a presentation.

**Felix (Geth)** (01:11:08):
I can give the presentation. I mean, there isn't really too much to present, per se. We didn't make the slides, so we… but I can still… I mean, we can look at the EIP together, and I can quickly give an overview by just showing the parts of it.

**Felix (Geth)** (01:11:20):
So, this EIP is a proposal that is in the line of proposals for account abstraction. And, specifically, it has… For us, it's mostly about abstracting the transaction signature away to a system where the user account itself verifies the validity of the transaction, and more specifically, the account itself verifies whether the transaction was sent by itself.

**Felix (Geth)** (01:12:13):
there is a lot of existing… there were a lot of previous EIPs regarded, related to account abstraction, one of them being the EIP7701. this is, in some ways, an evolution of the EIP7701, and it… the… also, the ideas in this EIP, 8141, were co-developed with… together with the team behind EIP7701, so it's kind of like, this is basically, like, the combination of all the ideas that various teams had.

**Felix (Geth)** (01:12:43):
so we feel like this is… we feel pretty good about this proposal, because a lot of these ideas that were previously already tested in ERC437 and during the EIP7701 development and so on, so there's, like, a lot, a lot, a lot of research behind it. That said, there's also some new stuff, and then one of the new things is this frame list. So basically this, transaction type allows… basically adds a list of multiple calls to the transaction, and then the calls run at different permission levels.

**Felix (Geth)** (01:13:22):
We have three modes of execution, we call it here, but they… you can think of them as, like, both a permission level, but also basically configuring the EVM environment a bit differently for each mode. So we have one… this is like the unauthenticated mode, where the call happens from the entry point address. We have one that is… we have a specific execution mode that is… executes like a static call, and this one is for the purpose of verifying the transaction signature, among other things. And then we have the sender mode, which basically executes as the actual transaction sender.

**Felix (Geth)** (01:15:28):
And, the fee payment is also decoupled from the sender, which is another goal of account abstraction, and it's also a goal that is specifically for the smart accounts and the wallets to be able to sponsor the transactions of their users.

**Felix (Geth)** (01:16:39):
The main one we have is… the one that actually changes the semantics the most is the approve opcode, which is basically another way to return. So this is, like, this is an opcode that terminates execution, and unlike return, it terminates it with a status code that is beyond the usual 0 and 1 status.

**Felix (Geth)** (01:18:11):
if you would use ECDSA signatures, like now, the overall size of the transaction is only, like, 30 bytes more, or something, or 20-something bytes more. So, we feel pretty comfortable with this design, and we are happy to defend it, and we propose it as the headliner, because we feel that It's a big change to the state transition. And it's also kind of, for us, the most important one, because of the readiness for the post-quantum world.

**Daniel Lehrner (Besu)** (01:19:17):
Yeah, so my… my concerns about this are not so much technical, but we have seen with 7702 that the option for the smart wallets, or for any changes in how we do… transaction signing is very, very low. So I think I checked before in one of these dashboards, and we only have, like, 5,000 Transaction… 7702 transactions per day. I'm a bit worried that we would do this as a headliner, as a preparation for post-quantum, but afterwards it's not really used.

**Felix (Geth)** (01:20:03):
for me, it's quite clear that, like, account abstraction has been one of these projects that has been ongoing for many years that people always wanted to realize... even now, with the EIP7702, it is kind of a… I mean, it is certainly a way to convert an existing account into an account with code, but it does not much more to help with the advanced use cases that people have, and also it is not quantum secure.

**Felix (Geth)** (01:21:49):
So, we feel like we just have to provide the means first, and then we have to work with everyone to build out their infrastructure, because there's almost no incentive to build another infrastructure for keys when the protocol doesn't support it and doesn't look like it will ever support it.

**Felix (Geth)** (01:22:21):
So, Frangio asked the question, how does it look in the mempool? And for this, I want to highlight that, this proposal has a section in the bottom that goes a bit into detail about this... The key thing to note is that while the inside of a block an arbitrary interaction can take place. For example, you could have transactions that do not contain a signature verifying frame. In some cases. This can actually be fine, but for the purposes of the mempool, we will validate the transaction to conform to a specific known frame structure.

**vitalik** (01:24:30):
Yeah, I think I also just wanted to add that, like, from a, use cases perspective, this, does, like, basically satisfy, everything that, at least I've been pushing for, like, the, entire list of, of goals of, account abstraction, including, you know, the original ones, and including various things that have been, bolted onto the topic over the years. And, and I think it's particularly nice how, like, this design has very few special purpose features from these things. They just, fall out naturally from the, ability to have multiple a verification frame and execution frames.

**vitalik** (01:25:15):
so it satisfies, the natural stuff, like, different signature algorithms, including, passkey friendliness, now that we also have the, SIG P256R1 precompile, it, satisfies post-quantum SIGs, it satisfies native multisig, it also, I think also worth highlighting, there's this nice synergy with, FOCIL, where, privacy protocols, and, also even, transactions paid with, Paymasters can be, sent through it.

## Eth R&D Discord Context
Source: Eth R&D Discord (user-provided)

**lightclient** (2026-01-28):
@fjl and I are proposing native account abstraction as the EL headliner for Hegota. We've been working with Vitalik to further generalize the previous native AA proposal EIP-7701 and have come up with the Frame Transaction. More here on the agenda: https://github.com/ethereum/pm/issues/1883#issuecomment-3815340368
EIP: https://eips.ethereum.org/EIPS/eip-8141
