# hasheus

verify the integrity of a file with the largest decentralized web of trust. built using
[lit](https://lit.dev/) and [vite+](https://viteplus.dev/).

## development

[vite+](https://viteplus.dev/) is used to develop, test, lint, and build the site. see their
[docs](https://viteplus.dev/guide/) for specifics not covered here.

### prerequisites

1. the [global `vp` cli](https://viteplus.dev/guide/#install-vp-globally), which picks the
   [node.js](https://nodejs.org/) and npm versions in `devEngines` in [`package.json`](package.json)
   automatically:

   ```bash
   curl -fsSL https://vite.plus | bash
   ```

2. [nak](https://github.com/fiatjaf/nak), whose built-in relay is used for local development and
   testing.

### dependencies

install dependencies:

```bash
vp install
```

### config

configuration is done through environment variables. see
[vite's guide](https://vite.dev/guide/env-and-mode.html) for full details.

[`.env.development`](.env.development) is under version control to quickly bootstrap your
development environment.

### start

start a local relay with [sample data](dev/README.md):

```bash
vp run dev:relay
```

then, in another terminal, start the development server:

```bash
vp dev
```

### tests

[vitest](https://vitest.dev/) runs the unit tests, which sit next to the modules they test
(`file.js` → `file.test.js`). to run them once:

```bash
vp test
```

or to rerun them as files change:

```bash
vp test watch
```

to see how much of `src/services` they cover, with an html report in `coverage`:

```bash
vp test --coverage
```

ci adds the coverage table to each run's summary. components aren't counted, since the end-to-end
tests cover them.

[playwright](https://playwright.dev/) runs the end-to-end tests in [`e2e`](e2e) against chromium,
firefox, and webkit. it starts its own [nak](https://github.com/fiatjaf/nak) relay and development
server on separate ports, so `nak` needs to be installed, but nothing needs to be running. install
the browsers once:

```bash
vp exec playwright install
```

then run the tests:

```bash
vp run test:e2e
```

a slower test that hashes a file over 512 mb only runs when asked for:

```bash
E2E_LARGE_FILE=1 vp run test:e2e
```

### code style & linting

[oxfmt](https://oxc.rs/docs/guide/usage/formatter.html) enforces a consistent code style, and
[oxlint](https://oxc.rs/docs/guide/usage/linter.html) enforces a level of code quality, both
configured in [`vite.config.js`](vite.config.js). [stylelint](https://stylelint.io/) is setup with
the [standard config](https://github.com/stylelint/stylelint-config-standard) to enforce css rules.
it's recommended to install the
[vite+ extension pack](https://marketplace.visualstudio.com/items?itemName=VoidZero.vite-plus-extension-pack)
and a [stylelint integration](https://stylelint.io/awesome-stylelint/#editor-integrations) for your
editor, which format and fix on save.

to run all via the command line:

```bash
vp run lint
```

or to fix what can be fixed automatically:

```bash
vp run lint:fix
```

## deployment

### release

when the `development` branch is ready for release,
[release it!](https://github.com/release-it/release-it) is used to orchestrate the release process:

```bash
vp run release
```

once the release process is complete, merge the `development` branch into the `main` branch, which
should always reflect the latest release.

### build

to generate a production build via the command line:

```bash
vp build
```

this creates a `dist` directory with the files to be deployed.

### docker

a [`Dockerfile`](Dockerfile) is included that builds and serves the site:

1. make sure you have docker installed and running.
   [docker desktop](https://www.docker.com/products/docker-desktop) is an easy way to get started on
   your own machine.
2. build an image named `hasheus` from the `Dockerfile`:

   ```bash
   docker build --tag hasheus .
   ```

   this generates a production build of the site using [`.env.production`](.env.production).
   [docker-static-website](https://github.com/lipanski/docker-static-website) is used to serve the
   site.

3. start a new container using the image, which serves the site on port `3000`:

   ```bash
   docker run --interactive --tty --rm --init --publish 3000:3000 hasheus
   ```

if you're just looking to build the site, but not serve it, you can change the `docker build`
command to export the `dist` directory from the docker image to your host machine:

```bash
docker build --target=export --output=dist --tag hasheus .
```
