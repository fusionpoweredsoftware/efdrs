# efdr.mjs

A command-line tool for generating and comparing the **Evolving Fibonacci Digital Root Sequences** (LEFDRS and GEFDRS).

These sequences combine Fibonacci-like recurrence with digital root reduction. When a repeating pattern is detected, the sequence "evolves" by summing more terms. The two variants differ in how they detect repetition: **LEFDRS** watches for a specific trigger pattern, while **GEFDRS** scans the entire history for any repeated window.

For most bases, both algorithms produce identical results. For some bases—starting with 137—they diverge.

## Installation

Requires Node.js and the `chalk` package:

```bash
npm install chalk
```

## Usage

```bash
node efdr.mjs [mode] [base=N] [length] [options]
```

### Mode

| Mode | Description |
|------|-------------|
| `lefdr` | Run Lesser EFDRS only (default) |
| `gefdr` | Run Greater EFDRS only |
| `both` | Run both and display side by side |

### Arguments

**`base=N`** — Set the base for digital root calculation (default: 10)

**`length`** — Number of terms to generate. Can be specified three ways:
- Absolute: `150` generates exactly 150 terms
- Relative positive: `+5` generates `base + 5` terms
- Relative negative: `-5` generates `base - 5` terms
- Default: 150 terms

### Options

**`quiet`** — Suppress the sequence output, show only evolution events

**`sfl=N`** — Show the digit at position `length - N` (useful for comparing final digits)

**`superquiet=FORMAT`** — Output only a formatted string using template codes (see below)

## Examples

Generate 150 terms of LEFDRS in base 10:
```bash
node efdr.mjs
```

Compare both algorithms in base 137 for exactly 137 terms:
```bash
node efdr.mjs both base=137 137
```

Check if base 137 diverges by comparing final digits:
```bash
node efdr.mjs both base=137 137 sfl=1 quiet
```

Generate `base + 0` terms (i.e., exactly `base` terms) for base 213:
```bash
node efdr.mjs both base=213 +0
```

## Output

The sequence is printed as comma-separated values. Terms that triggered an evolution are highlighted in **cyan**.

After the sequence, evolution events are listed:
```
Repeats:
  1,1 at position 36, now using 3 terms
  136,1,1 at position 131, now using 4 terms
```

## Superquiet Mode

For scripting, `superquiet=FORMAT` outputs only a formatted string. Use `@@code` to insert values:

| Code | Description |
|------|-------------|
| `@@b` | Base |
| `@@d` | Number of digits generated |
| `@@dsfl` | Final digit (LEFDRS) |
| `@@Dsfl` | Final digit (GEFDRS) |
| `@@dsfl[N]` | Digit at position `length - N` (LEFDRS) |
| `@@Dsfl[N]` | Digit at position `length - N` (GEFDRS) |
| `@@rpos` | Position of last evolution (LEFDRS) |
| `@@Rpos` | Position of last evolution (GEFDRS) |
| `@@rpat` | Pattern that triggered last evolution (LEFDRS) |
| `@@Rpat` | Pattern that triggered last evolution (GEFDRS) |
| `@@rntc` | New term count after last evolution (LEFDRS) |
| `@@Rntc` | New term count after last evolution (GEFDRS) |

Add `[N]` to access the Nth-from-last item (e.g., `@@rpos[2]` for second-to-last evolution).

Example — check for divergence:
```bash
node efdr.mjs both base=137 137 "superquiet=Base @@b: LEFDRS=@@dsfl, GEFDRS=@@Dsfl"
# Output: Base 137: LEFDRS=8, GEFDRS=4
```

## Finding Divergent Bases

To test a range of bases for divergence:

```bash
for b in {2..500}; do
  L=$(node efdr.mjs lefdr base=$b $b sfl=1 quiet 2>/dev/null | grep "sfl=1" | awk '{print $NF}')
  G=$(node efdr.mjs gefdr base=$b $b sfl=1 quiet 2>/dev/null | grep "sfl=1" | awk '{print $NF}')
  [ "$L" != "$G" ] && echo "$b"
done
```

Known divergent bases (first 20): 137, 213, 273, 319, 422, 425, 477, 478, 545, 565, 598, 637, 638, 673, 729, 845, 897, 953, 958, 1002

## Background

See the accompanying paper *"The Evolving Fibonacci Digital Root Sequence: LEFDRS, GEFDRS, and the Divergent Bases"* for the mathematical background and open problems.

## License

MIT
