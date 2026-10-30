# hasheus

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

2. [nak](https://github.com/fiatjaf/nak), whose built-in relay is used for local
   development and testing.

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

start a local relay with [sample data](#sample-data):

```bash
npm run dev:relay
```

then, in another terminal, start the development server:

```bash
npm run dev
```

### sample data

`npm run dev:relay` loads [`dev/seed.jsonl`](dev/seed.jsonl) into an in-memory
relay, so it starts fresh each time. it has verifications of the files in
[`dev/files`](dev/files), one for each case:

- `trusted.txt`: alice & bob agree on the url.
- `yours.txt`: dev verified it, and mallory's verification is dated past the
  last date javascript can show.
- `untrusted.txt`: only mallory verified it.
- `disagreed.txt`: bob & carol outnumber alice on the url.
- `backdated.txt`: mallory backdated a different url before alice's.
- `hostile.txt`: a carriage return & bidi overrides in the description and url,
  plus a `javascript:` url. mallory's display name has escape codes too.
- `unverified.txt`: no one has verified it.

sign in as dev to see the files through a web of trust. these keys are public,
so never use them anywhere real:

| user     | notes                                                                  | npub                                                              | nsec                                                              |
| -------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------- |
| dev      | follows alice, bob, and carol                                          | `npub14c2q4hscm8qujl4wu276n8095kz4p8s409gnu994f9sns0tsk63qgee7cz` | `nsec1ngmdwu7uye2xs80nyrx5dvtgnmkm6gqmq2jd2kd9xpe878fehvmstwqynm` |
| alice    | trusted by dev                                                         | `npub1zyp3k9kxkj7n8cqe0vnvwp9cm86ck0lygnpgle53jmft9pxf42fsqa9tjy` | `nsec1kjgga8lgac48836ajy4asnxr8wm20w3hw84wy4hrntl0lpcd7wsszqhw4h` |
| bob      | trusted by dev                                                         | `npub13kavuf67c973pfdfku9ghekjflmql4cyv39nj0uln2h9usps7ehq0st9jz` | `nsec126ppqly6r6cr0lkq8l0enhtjrlzy36a550f6x60ytdpxe0afaj7q396wh8` |
| carol    | trusted by dev                                                         | `npub1vnmmfzg5em66ulduy57dpu9jyc6n0gygrqw48lc56y638dupxn3su3tf44` | `nsec1vud3etf4anfeqwur9rcr2nun207ankyvqkkwzc4ng6j4d5cxqrvs2fzcwr` |
| mallory  | untrusted, with escape codes and a bidi override in their display name | `npub1x6ldzxyhvlsgy73xxwwg4gqc48djfa2uv9j93fl8n6nlxqj5kjws3zy6mj` | `nsec17r9px2nv9yhnz2p5938395v4ytuqc54e4n28s2nfr3uy35cejpes8jtkrp` |
| newcomer | no profile or follow list, for publishing as someone new               | `npub1fm8jeugesk6wfqx9njrgdsdv2cpns46vmkddja2g0lev6pz0hdlqyhgjve` | `nsec16s9vd47k5g648qw3593arhgwm5apswa8s8tw402ss83dqap4pr0s8f6tlm` |

to test hasheus-cli as dev against the relay, source
[`dev/cli.env`](dev/cli.env).

to change the sample data, edit [`dev/seed.js`](dev/seed.js) or the files, then
regenerate it:

```bash
npm run dev:seed
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

to see how much of `src/services` they cover, with an html report in `coverage`:

```bash
npm run test:coverage
```

ci adds the coverage table to each run's summary. components aren't counted,
since the end-to-end tests cover them.

[playwright](https://playwright.dev/) runs the end-to-end tests in [`e2e`](e2e)
against chromium, firefox, and webkit. it starts its own
[nak](https://github.com/fiatjaf/nak) relay and development server on separate
ports, so `nak` needs to be installed, but nothing needs to be running. install
the browsers once:

```bash
npx playwright install
```

then run the tests:

```bash
npm run test:e2e
```

a slower test that hashes a file over 512 mb only runs when asked for:

```bash
E2E_LARGE_FILE=1 npm run test:e2e
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
2. build an image named `hasheus` from the `Dockerfile`:

   ```bash
   docker build --tag hasheus .
   ```

   this generates a production build of the site using
   [`.env.production`](.env.production).
   [docker-static-website](https://github.com/lipanski/docker-static-website) is
   used to serve the site.

3. start a new container using the image, which serves the site on port `3000`:

   ```bash
   docker run --interactive --tty --rm --init --publish 3000:3000 hasheus
   ```

if you're just looking to build the site, but not serve it, you can change the
`docker build` command to export the `dist` directory from the docker image to
your host machine:

```bash
docker build --target=export --output=dist --tag hasheus .
```
