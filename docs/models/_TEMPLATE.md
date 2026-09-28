# <Model name> (<abbr>)

> Copy this file to `docs/models/<model>.md` for each new die-cut type.
> Keep numbers/formulas in sync with the code in `src/core/models/<model>.ts`.

## What it is
One-paragraph description + typical use case (what product it packages).

## Reference example(s)
- Real box: name, dimensions (in + mm), where it came from.

## Dimension semantics
Define exactly what L / W / H (and any extra inputs) mean for THIS model, and
which physical face each maps to. Include a note on inner vs outer vs
manufacture dimensions if relevant.

## Flat layout
ASCII sketch or description of the panel arrangement (left→right, top/bottom
flaps). Name every panel and flap.

## Parameters & defaults
Table: param, meaning, default formula, source line in code.

## Flat-size formulas
- `bboxW = ...`
- `bboxH = ...`
- Worked example with one real box (cut-only size and size-incl-bleed).

## Closure / locking
How the box closes (tuck, glue, lock). Any tolerance allowances using
`thickness`.

## Cut vs fold / cutting notes
Anything model-specific for Silhouette/printers beyond the shared conventions.

## Implementation
- File: `src/core/models/<model>.ts`
- Exported fn(s): `buildXxx(params)`, `defaultParams(...)`
- Notable details / gotchas.

## Changelog
- YYYY-MM-DD initial entry.
