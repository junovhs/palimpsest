# Palimpsest — the six-cell spring

Built and explored on September 11, 2026. This is a designed cellular automaton and a reproducible discovery inside it: a six-cell starting pattern becomes a two-type oscillator, with an extinction interval between two sustained regimes.

## The find

Plant this two-column, three-row pattern in an otherwise empty world:

```
3 A
4 2
3 A
```

`A` is an active positive pulse. Numbers are recovery timers, not active pulses. All ground memory starts at zero. The two A cells are the only initial activity; there are no B pulses, continuing random inputs, or scheduled triggers.

With the Cathedral rules below, B first appears at tick 6. The source produces expanding nested fronts. With absorbing edges, the complete world state eventually repeats every 26 ticks. On a 96×96 grid, states 63 and 89 are exactly equal, including all pulses, recovery timers, and memory values. At tick 76, the pulse signs and memory signs are exactly inverted relative to tick 63, while recovery timers are unchanged. Thus the halfway point exchanges A and B.

Because the update is deterministic, exact full-state recurrence certifies indefinite repetition on that finite grid. This is stronger than watching a long animation. It does not establish the behavior of an infinite grid.

## The unexpected transition

Keep the same six-cell pattern and change only the memory deposited by an active cell. Exhaustive testing of every integer deposit from 0 through 64 on a 48×48 absorbing grid gave:

| Memory deposit | Long-term result |
|---|---|
| 0–5 | A-only oscillator, period 6 |
| 6 | A-only oscillator, period 7 |
| 7–19 | Entire world becomes empty, including memory |
| 20–64 | A/B oscillator, period 26 |

The mechanism suggested by the rule is straightforward: intermediate memory blocks the original pulse without providing enough support for its opposite; stronger memory permits the opposite type to ignite. The exact boundaries above are verified computationally, not asserted as a theorem for arbitrary seeds or grid sizes.

## Exact rule

Every cell stores three integers: pulse `a ∈ {-1,0,+1}`, recovery timer `c ≥ 0`, and memory `m ∈ [-64,64]`. A means +1; B means -1. Updates are simultaneous. Count positive and negative pulses in the eight adjacent cells as `P` and `N`.

For Cathedral:

```
bias = truncate_toward_zero(m / 2)
A_score = 4*P - 2*N - bias
B_score = 4*N - 2*P + bias
```

A resting cell (`a=0` and `c=0`) with at least one active neighbor fires whichever score is strictly larger, provided that score is at least 4. Ties do not fire. An active cell stops firing on the next tick and sets its recovery timer to 4. Other timers decrease by one, stopping at zero. Memory updates from the OLD pulse state:

```
new_memory = clamp(m - sign(m) + deposit*a, -64, +64)
```

The default deposit is 24. These rules do not assign a permanent species to a cell: a pulse can induce its opposite when the local memory outweighs its neighbors' current influence.

For absorbing edges, every boundary cell is forced to zero in all three state arrays after each update. No wave can enter from an opposite edge. The interactive visual also offers wrapping as an explicit option.

Estuary and Tidal use the same rule family with different thresholds, recovery, memory, and crowding parameters. Their parameters are recorded in `PRESETS` in the source. The spring result specifically uses Cathedral.

## Verification and search record

- Explored 144 parameter settings with an initial rule that required an existing neighbor of the same pulse type. Revised that restriction, then tested 144 settings in the revised rule and 96 additional settings with a short-cycle penalty. The ranking functions were practical search heuristics, not validated measures of complexity.
- Compared memory on/off for Cathedral and Estuary over 4 held-out random seeds and 3 sizes (72, 144, 240), running each for 2,400 updates. Some Estuary runs nearly died; there is no claim of universally sustained richness.
- Searched 480 small 3×3 starting patterns across three presets. One passed the chosen sustained-core, two-type criterion after 300 ticks: the six-cell spring.
- Tested all 63 nonempty subsets of those six occupied sites, with their original timer values. Only the complete pattern passed the same criterion after 350 ticks. This does NOT prove it is the smallest possible oscillator; positions, timer values, and the survival criterion were restricted.
- Tested the spring for 6,000 ticks at 48×48, 96×96, and 192×192 with absorbing edges, with and without memory.
- Found and verified exact array recurrence at those three sizes. With memory: period 26; without memory: period 6. Transients depend on grid size.
- Independently checked that the interactive JavaScript engine matches Python exactly for seeded initialization and 75 updates of all three presets. The JavaScript engine also reproduces the spring's 13-tick sign inversion and 26-tick full-state recurrence.
- Verified sign-inversion symmetry, 90-degree rotation symmetry, and that an empty world stays empty in the Python rule.

## Reproduce

Requires Python, NumPy, and Pillow. Run in a directory of your choosing:

```
python palimpsest.py --verify-spring --out results
python palimpsest.py --spring --size 96 --steps 260 --out spring-animation
python palimpsest.py --preset estuary --seed 17 --steps 1200 --out estuary-animation
```

The verifier independently regenerates the exact-cycle certificates and the complete deposit sweep, checking actual arrays after locating repeat candidates by SHA-256. The visual uses a separate xorshift initializer (`seed_sketch`) for its scattered worlds; the spring is identical in both implementations. The command-line random-island initializer uses NumPy instead.

`cycle-certificate.json`, `deposit-sweep.json`, `spring-results.json`, `cathedral-results.json`, and `experiment-results.json` contain the recorded measurements. `six-cell-spring.gif` shows the spring forming and repeating.

## Related work and scope

Excitable cellular automata and memory in such systems are established research areas: see [Fisch, Gravner, and Griffeath, Threshold-Range Scaling of Excitable Cellular Automata](https://arxiv.org/abs/patt-sol/9304001), [Adamatzky and Chua, Phenomenology of retained refractoriness](https://arxiv.org/abs/1111.3525), and [Alonso-Sanz and Adamatzky, On Memory and Structural Dynamism in Excitable Cellular Automata with Defensive Inhibition](https://arxiv.org/abs/1212.2821).

Those connections were checked during this session. The exact rule and six-cell behavior have not undergone an exhaustive literature review. The substantive output is the inspectable rule, reproducible oscillator, verified transition, and a visual playground—not a claim that memory automata or oscillators were invented here.

## Follow-up search — September 12, 2026

An expanded search using this same method found 11 additional 26-tick source variants, including a five-cell seed with different positions and timers. The original six-cell subset test did not exclude this. All 11 have independent full-state certificates at three sizes. See the [new search record](spring-hunt.md) for seeds, bounds, comparisons, and reproduction commands.
