# Peitho-Composer

Bun-served 8-bar MIDI composition surface using `@peitho/array` and
`@peitho/pulse`.

```sh
# workspace root
./dev.sh
```

Active files:

- `public/index.html`: Design Component UI and interaction state.
- `src/composer-engine.ts`: preset-to-engine translation and browser facade.
- `src/pulse-api.ts`: Pulse HTTP endpoints.
- `src/static-assets.ts`: static files and on-demand browser bundle.
- `src/server.ts`: server composition only.

`/composer-engine.js` is built in memory. Do not commit a generated copy.

Reference-only prototype: `.contrib/Peitho/Peitho.dc.html`.

See [Composer documentation](../../docs/peitho-composer.md).
