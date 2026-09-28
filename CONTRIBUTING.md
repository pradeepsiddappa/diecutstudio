# Contributing to Die Cut Studio

Thanks for helping! Bug reports, fixes and new templates are all welcome.

## Dev setup

```bash
npm install      # also configures the git pre-commit hook
npm run dev      # http://localhost:5180
```

The pre-commit hook runs `npm run typecheck` and `npm test`. CI runs the same
plus a production build on every push and pull request.

## Adding a new template

Follow "How to add a new model" in [`docs/README.md`](docs/README.md). In short:

1. Write a pure `(params) => Dieline` function in `src/core/models/`, with all
   geometry in **points** (1 in = 72 pt).
2. Register it in `src/core/models/registry.ts` and add a gallery card in
   `src/ui/pages/Landing.tsx`.
3. Optionally give it a 3D fold (a `FoldSpec` in `src/core/fold/specs.ts`).
4. Add tests (flat-size formula, crease count, export page size).
5. Document it: copy `docs/models/_TEMPLATE.md`.

## IP rules (important)

- Every model must come from **public structural formulas** (ECMA, FEFCO,
  packaging textbooks) or plain functional geometry.
- **Never** import, trace or copy SVG/DXF/PDF files or code from other dieline
  tools, templates or artists.
- Don't implement trademarked or patented mechanisms, or branded characters.
  If you're unsure, open an issue first. See
  [`docs/box-styles-catalog.md`](docs/box-styles-catalog.md).

## Testing

Behaviour changes should come with a test in `tests/diecut.test.ts` that locks
in the new invariant (e.g. exact flat size, crease count, closed 3D bounding box).

## License

By contributing you agree your contributions are licensed under the
[MIT License](LICENSE).
