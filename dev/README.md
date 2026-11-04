# sample data

`vp run dev:relay` loads [`seed.jsonl`](seed.jsonl) into an in-memory relay, so it starts fresh each
time. it has verifications of the files in [`files`](files), one for each case:

- `trusted.txt`: alice & bob agree on the url.
- `yours.txt`: dev verified it, and mallory's verification is dated past the last date javascript
  can show.
- `untrusted.txt`: only mallory verified it.
- `disagreed.txt`: bob & carol outnumber alice on the url.
- `backdated.txt`: mallory backdated a different url before alice's.
- `hostile.txt`: a carriage return & bidi overrides in the description and url, plus a `javascript:`
  url. mallory's display name has escape codes too.
- `unverified.txt`: no one has verified it.

sign in as dev to see the files through a web of trust. these keys are public, so never use them
anywhere real:

| user     | notes                                                                  | npub                                                              | nsec                                                              |
| -------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------- |
| dev      | follows alice, bob, and carol                                          | `npub14c2q4hscm8qujl4wu276n8095kz4p8s409gnu994f9sns0tsk63qgee7cz` | `nsec1ngmdwu7uye2xs80nyrx5dvtgnmkm6gqmq2jd2kd9xpe878fehvmstwqynm` |
| alice    | trusted by dev                                                         | `npub1zyp3k9kxkj7n8cqe0vnvwp9cm86ck0lygnpgle53jmft9pxf42fsqa9tjy` | `nsec1kjgga8lgac48836ajy4asnxr8wm20w3hw84wy4hrntl0lpcd7wsszqhw4h` |
| bob      | trusted by dev                                                         | `npub13kavuf67c973pfdfku9ghekjflmql4cyv39nj0uln2h9usps7ehq0st9jz` | `nsec126ppqly6r6cr0lkq8l0enhtjrlzy36a550f6x60ytdpxe0afaj7q396wh8` |
| carol    | trusted by dev                                                         | `npub1vnmmfzg5em66ulduy57dpu9jyc6n0gygrqw48lc56y638dupxn3su3tf44` | `nsec1vud3etf4anfeqwur9rcr2nun207ankyvqkkwzc4ng6j4d5cxqrvs2fzcwr` |
| mallory  | untrusted, with escape codes and a bidi override in their display name | `npub1x6ldzxyhvlsgy73xxwwg4gqc48djfa2uv9j93fl8n6nlxqj5kjws3zy6mj` | `nsec17r9px2nv9yhnz2p5938395v4ytuqc54e4n28s2nfr3uy35cejpes8jtkrp` |
| newcomer | no profile or follow list, for publishing as someone new               | `npub1fm8jeugesk6wfqx9njrgdsdv2cpns46vmkddja2g0lev6pz0hdlqyhgjve` | `nsec16s9vd47k5g648qw3593arhgwm5apswa8s8tw402ss83dqap4pr0s8f6tlm` |

to test [hasheus-cli](https://github.com/tinfoilhash/hasheus-cli) as dev against the relay, source
[`cli.env`](cli.env).

to change the sample data, edit [`seed.js`](seed.js) or the files, then regenerate it:

```bash
vp run dev:seed
```
