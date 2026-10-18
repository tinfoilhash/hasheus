# tinfoil hash / verify

verify the integrity of a file with the largest decentralized web of trust.
built using [lit](https://lit.dev/) and [vite](https://vitejs.dev/).

## development

[vite](https://vitejs.dev/) is used to develop and build the site. see their
[docs](https://vitejs.dev/guide/) for specifics not covered here.

### prerequisites

1. a compatible version of [node.js](https://nodejs.org/) (see `engines.node` in
   [`package.json`](package.json)). [nvm](https://github.com/nvm-sh/nvm) is the
   recommended installation method:

   ```bash
   nvm install
   ```

2. a nostr relay. any will work, but a good option for local development and
   testing is built into [nak](https://github.com/fiatjaf/nak):

   ```bash
   nak serve
   ```

### dependencies

install dependencies with npm:

```bash
npm install
```

### config

configuration is done through environment variables. see
[vite's guide](https://vitejs.dev/guide/env-and-mode.html) for full details.

[`.env.development`](.env.development) is under version control to quickly
bootstrap your development environment.

### start

start the development server:

```bash
npm run dev
```

### tests

[vitest](https://vitest.dev/) runs the unit tests, which sit next to the modules
they test (`file.js` → `file.test.js`). to run them once:

```bash
npm test
```

or to rerun them as files change:

```bash
npm run test:watch
```

### code style & linting

[prettier](https://prettier.io/) is setup to enforce a consistent code style.
it's recommended to
[add an integration to your editor](https://prettier.io/docs/editors.html) that
automatically formats on save.

[eslint](https://eslint.org/) is setup with the
["recommended" rules](https://eslint.org/docs/latest/rules/) to enforce a level
of code quality. it's also recommended to
[add an integration to your editor](https://eslint.org/docs/latest/use/integrations#editors)
that automatically formats on save.

[stylelint](https://stylelint.io/) is setup with the
[standard config](https://github.com/stylelint/stylelint-config-standard) to
enforce css rules. it's also recommended to
[add an integration to your editor](https://stylelint.io/awesome-stylelint/#editor-integrations)
that automatically formats on save.

to run all via the command line:

```bash
npm run lint
```

## deployment

### release

when the `development` branch is ready for release,
[release it!](https://github.com/release-it/release-it) is used to orchestrate
the release process:

```bash
npm run release
```

once the release process is complete, merge the `development` branch into the
`main` branch, which should always reflect the latest release.

### build

to generate a production build via the command line:

```bash
npm run build
```

this creates a `dist` directory with the files to be deployed.

### docker

a [`Dockerfile`](Dockerfile) is included that builds and serves the site:

1. make sure you have docker installed and running.
   [docker desktop](https://www.docker.com/products/docker-desktop) is an easy
   way to get started on your own machine.
2. build an image named `verify` from the `Dockerfile`:

   ```bash
   docker build --tag verify .
   ```

   this generates a production build of the site using
   [`.env.production`](.env.production).
   [docker-static-website](https://github.com/lipanski/docker-static-website) is
   used to serve the site.

3. start a new container using the image, which serves the site on port `3000`:

   ```bash
   docker run --interactive --tty --rm --init --publish 3000:3000 verify
   ```

if you're just looking to build the site, but not serve it, you can change the
`docker build` command to export the `dist` directory from the docker image to
your host machine:

```bash
docker build --target=export --output=dist --tag verify .
```
