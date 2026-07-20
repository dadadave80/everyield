// @particle-network/universal-account-sdk@1.1.1 ships correct `main`/`module`/`types`
// fields, but its `exports` map only declares `import`/`require` conditions (no `types`
// condition). Under `moduleResolution: "bundler"`, TypeScript resolves package types via
// the `exports` map when present, so a bare-specifier import of the package resolves to
// the untyped `dist/index.mjs` and loses all type information. This file re-exports the
// package's real (typed) entrypoint and is pointed at by the `paths` alias below, giving
// both TypeScript and the bundler a typed indirection without touching node_modules.
export * from "../node_modules/@particle-network/universal-account-sdk/dist/index";
