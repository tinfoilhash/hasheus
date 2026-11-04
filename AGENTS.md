# hasheus

a web app that verifies the integrity of a file with nostr's web of trust, built with plain
javascript and [lit](https://lit.dev/). see the [readme](README.md) for setup and every command.

## commands

- `vp run check` checks formatting, lints, and runs stylelint. `vp check` alone skips stylelint, so
  use the script. `vp run check:fix` fixes what it can.
- `vp test` runs the unit tests, and `vp run test:e2e` runs the playwright tests, which need
  [nak](https://github.com/fiatjaf/nak) installed.
- `vp build` builds the site.

a change is done when `vp run check`, `vp test`, and `vp build` pass, plus `vp run test:e2e` when it
touches components or user flows.

## layout

- `src/components`: lit elements, prefixed `h-` (`h-start` → `HStart`), grouped by page, with shared
  ones in `base`.
- `src/services`: the app's logic, mostly nostr events, subscriptions, and publishing.
- `src/lib`: small, generic helpers.
- `src/test`: helpers shared by unit tests.
- `e2e`: playwright tests and their relay & server setup.
- `dev`: sample data for the local relay. see [`dev/README.md`](dev/README.md).

## conventions

- javascript only, no typescript or typed jsdoc.
- files are snake_case with one default export.
- import from `src` through the `@/` alias, not relative paths.
- unit tests sit next to the module they test (`file.js` → `file.test.js`) and import from
  `vite-plus/test`. components are covered by the end-to-end tests instead.
- copy is lowercase: ui text, comments, docs, commits, and pull requests.

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Built-in Commands vs Scripts

`vp <name>` runs a built-in command. `vp run <name>` runs a `package.json` script or a `vite.config.ts` task. Scripts cannot overwrite built-ins, so `vp dev` and `vp run dev` may do different things. Check `package.json` and `vite.config.ts` first, and run `vp run <name>` when the project defines a script or task with that name.

## Running Scripts

Run TypeScript and JavaScript files with `vpx <file>`, for example `vpx ./scripts/seed.ts --dry-run`. It handles enums, decorators, JSX, and tsconfig `paths`, so do not add `tsx` or `ts-node` to run scripts. `vpx --watch <file>` reruns the file when a file it uses changes, in place of `tsx watch`. `vp node <file>` runs plain Node.js.

## Tool Versions

Run `vp toolchain` to show versions and relationships in the active Vite+
release. Add a tool name to select part of the graph. For example, run
`vp toolchain vite`. Use `--global` to ignore the local `vite-plus` package. Use
`vp why <package>` to show the package-manager dependency graph.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->
