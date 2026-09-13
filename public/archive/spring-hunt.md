# Expanded spring search — September 12, 2026

Repeating the original discovery method found **11 additional sustained source variants**, including a **five-cell seed**. All use unchanged Cathedral rules, zero initial memory, only A pulses and recovery timers, and no continuing inputs. All have period 26; this search found new source shapes, not a new period.

The search tested 1,800 deterministic 3×3 seeds (600 each under Cathedral, Estuary and Tidal), then 150 single-site replacements around the original spring. Of 1,950 trials, 95 passed the original sustained-core/two-type screening criterion. The first fingerprint filter classified 84 as repeats of previously seen source neighborhoods. All 11 retained variants passed exact full-state recurrence at 48×48, 96×96 and 192×192 with absorbing edges. No Estuary or Tidal seed passed this screening.

The independent NumPy implementation regenerated all 33 certificates, comparing every pulse, recovery and memory integer and matching the saved SHA-256 hashes. It also compared complete 26-frame central 13×13 neighborhoods under temporal phase, all eight square symmetries, sign reversal, and translations up to four cells in each direction. None matched the original or another retained variant. A translated, rotated, sign-reversed original spring correctly matched the original as a control.

These are observed distinctions between source neighborhoods, not an exhaustive equivalence classification. Full-state recurrence proves indefinite repetition only in the specified finite absorbing worlds. These sources emit waves; they are not compact, isolated full-state oscillators. Greedy deletion preserves the source fingerprint until no single site can be removed; it does not establish a globally smallest seed. The old six-cell subset result remains valid for its fixed sites and timers.

## Try the discoveries

The Pattern atlas and Starting pattern menu now offer **Five-cell spring**, **Eight-cell spring**, and **Retimed spring**. They load Cathedral rules; the atlas uses the usual 144×144 viewing world. The archived certificates below are for 48, 96 and 192, not a claim about every editable rule or size.

`A` means pulse +1; digits are recovery timers; `.` is empty. All memory is zero. Grids below show only each seed’s bounding box. Archive coordinates are `[x, y, pulse, recovery]` relative to the world center.

### 1. Five-cell spring

5 occupied cells; found by `random-3x3-41`.

```text
3 4 A
. 4 A
```

| World | First exact cycle starts | Period | Repeat tick |
|---|---:|---:|---:|
| 48×48 | 52 | 26 | 78 |
| 96×96 | 76 | 26 | 102 |
| 192×192 | 124 | 26 | 150 |

### 2. Eight-cell spring

8 occupied cells; found by `random-3x3-225`.

```text
A 2 A
4 . A
3 2 3
```

| World | First exact cycle starts | Period | Repeat tick |
|---|---:|---:|---:|
| 48×48 | 37 | 26 | 63 |
| 96×96 | 61 | 26 | 87 |
| 192×192 | 109 | 26 | 135 |

### 3. Variant 3

7 occupied cells; found by `spring-replacement-0,-2,3`.

```text
3 .
3 A
4 2
3 A
```

| World | First exact cycle starts | Period | Repeat tick |
|---|---:|---:|---:|
| 48×48 | 39 | 26 | 65 |
| 96×96 | 63 | 26 | 89 |
| 192×192 | 111 | 26 | 137 |

### 4. Variant 4

7 occupied cells; found by `spring-replacement-2,-2,2`.

```text
. . 2
3 A .
4 2 .
3 A .
```

| World | First exact cycle starts | Period | Repeat tick |
|---|---:|---:|---:|
| 48×48 | 39 | 26 | 65 |
| 96×96 | 63 | 26 | 89 |
| 192×192 | 111 | 26 | 137 |

### 5. Variant 5

7 occupied cells; found by `spring-replacement-2,-2,4`.

```text
. . 4
3 A .
4 2 .
3 A .
```

| World | First exact cycle starts | Period | Repeat tick |
|---|---:|---:|---:|
| 48×48 | 68 | 26 | 94 |
| 96×96 | 92 | 26 | 118 |
| 192×192 | 140 | 26 | 166 |

### 6. Variant 6

7 occupied cells; found by `spring-replacement-2,-2,5`.

```text
. . A
3 A .
4 2 .
3 A .
```

| World | First exact cycle starts | Period | Repeat tick |
|---|---:|---:|---:|
| 48×48 | 39 | 26 | 65 |
| 96×96 | 63 | 26 | 89 |
| 192×192 | 111 | 26 | 137 |

### 7. Variant 7

7 occupied cells; found by `spring-replacement--1,-1,4`.

```text
4 3 A
. 4 2
. 3 A
```

| World | First exact cycle starts | Period | Repeat tick |
|---|---:|---:|---:|
| 48×48 | 39 | 26 | 65 |
| 96×96 | 63 | 26 | 89 |
| 192×192 | 111 | 26 | 137 |

### 8. Retimed spring

6 occupied cells; found by `spring-replacement-0,-1,4`.

```text
4 A
4 2
3 A
```

| World | First exact cycle starts | Period | Repeat tick |
|---|---:|---:|---:|
| 48×48 | 39 | 26 | 65 |
| 96×96 | 63 | 26 | 89 |
| 192×192 | 111 | 26 | 137 |

### 9. Variant 9

7 occupied cells; found by `spring-replacement-2,-1,5`.

```text
3 A A
4 2 .
3 A .
```

| World | First exact cycle starts | Period | Repeat tick |
|---|---:|---:|---:|
| 48×48 | 39 | 26 | 65 |
| 96×96 | 63 | 26 | 89 |
| 192×192 | 111 | 26 | 137 |

### 10. Variant 10

7 occupied cells; found by `spring-replacement--1,0,3`.

```text
. 3 A
3 4 2
. 3 A
```

| World | First exact cycle starts | Period | Repeat tick |
|---|---:|---:|---:|
| 48×48 | 52 | 26 | 78 |
| 96×96 | 76 | 26 | 102 |
| 192×192 | 124 | 26 | 150 |

### 11. Variant 11

7 occupied cells; found by `spring-replacement-2,0,5`.

```text
3 A .
4 2 A
3 A .
```

| World | First exact cycle starts | Period | Repeat tick |
|---|---:|---:|---:|
| 48×48 | 39 | 26 | 65 |
| 96×96 | 63 | 26 | 89 |
| 192×192 | 111 | 26 | 137 |

## Reproduce

```sh
npm run hunt:springs
python3 reference/verify_springs.py
npm test
```

The deterministic TypeScript search uses xorshift32 seed 8242026; it does not pretend to reproduce NumPy’s historical random sequence. The Python verifier requires the existing `reference/requirements.txt` dependencies.

- [Seeds, search metadata and certificates](spring-hunt.json)
- [Independent verification and equivalence comparisons](spring-hunt-verification.json)
