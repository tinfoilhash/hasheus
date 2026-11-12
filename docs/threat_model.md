# threat model

what a hasheus verification proves, what it doesn't, and what you have to trust to rely on one. it
covers the web app and the [cli](https://github.com/tinfoilhash/hasheus-cli), which follow the same
rules. it describes how hasheus is meant to behave, and where it doesn't yet, an issue tracks the
gap.

## what a verification is

a verification is a [nip-94](https://github.com/nostr-protocol/nips/blob/master/94.md) event (kind
1063), signed by its verifier's key, with:

- `x`: the file's sha-256 hash.
- `url`: a link to the file.
- `m` and `size`: its type and size.
- its content: a description, like "firefox 132.0 for macos".
- `created_at`: when the verifier says they signed it.

a result is every verification of a hash that the file relays return, each marked trusted or
unknown.

## what a result proves

a trusted verification proves one thing: **the holder of a key in your web of trust signed a
statement naming the exact file you have.**

that holds as long as [what you have to trust](#what-you-have-to-trust) holds, and the hash was
worked out on your computer, from the file you're going to use. a result page someone sends you is
about its hash, not about a file they send with it.

a result doesn't prove:

- that the verifier checked the file, or how. see [claimed check methods](#claimed-check-methods).
- that the file is official, current, or safe. hasheus isn't a virus scanner.
- that a verifier is who their name and picture say. trust follows keys, and anyone can copy a name
  or a picture.
- that several trusted verifiers checked the file independently. one person can hold several keys,
  and verifiers can copy each other.
- that no one has verified a file, when it shows none. see
  [relay availability](#relay-availability).
- anything bad about a file. unknown means outside your web of trust, not wrong.

## matching metadata

only the hash is matched. clients check every verification's signature, and drop any that isn't a
kind 1063 event naming the hash looked up.

everything else in a verification is its verifier's claim, which hasheus shows but doesn't check:

- **description.** free text. a careless or malicious trusted verifier can describe a file as
  something it isn't, so check it against what you meant to get.
- **url.** shown as the file's link, and only if it's http or https. it doesn't prove the file came
  from there, or that the link still serves the same file.
- **`created_at`.** set by the signer. the file relay rejects times more than 30 minutes ahead, but
  anyone can backdate, so it's shown as the signer's time and never as proof of when something
  happened. when one key verifies a file more than once, only its earliest verification counts.

### which link and description are shown

a result shows one link and one description, picked like this:

- with trusted verifiers, the link is the one shared by the most trusted keys, and "+n trusted"
  counts the others sharing it. the description comes from the earliest of those verifications. ties
  go to the link whose first verification is earliest.
- with none, both come from the earliest verification, marked unknown.

agreement covers the link only. keys that share a link can still describe the file differently, and
the description shown is one verifier's. since anyone can backdate, a trusted key can make its
description the one shown, or win a tie, and with no trusted verifiers, anyone can pick what's
shown. backdating never changes which keys are trusted. links and descriptions can differ for good
reasons, like mirrors and wording, so a difference is shown as one, not as a dispute.

## trusted keys

your web of trust is your key and the keys in your follow list (kind 3), one hop only. a
verification is trusted when it's signed by one of those keys.

- a follow isn't an endorsement of someone's file-checking. people follow for many reasons, and
  every follow counts.
- trust is by key. a stolen key stays trusted until you unfollow it, and its verifications look the
  same before and after the theft.
- your follow list comes from user relays, which can't forge it but can withhold it or serve an
  older one. clients use the newest list a relay returns, or the stored one if it's newer, and fetch
  it again after an hour. if no relay returns one, the stored list is dropped, so withholding shows
  fewer verifications as trusted, which fails safe. an older list doesn't: it can still include a
  key you've unfollowed, so an unfollow only applies once a relay serves the newer list.
- seeing a result through someone else's follows trusts their choice of who to follow. the cli does
  this with `--user`, but the web app can't yet
  ([#71](https://github.com/tinfoilhash/hasheus/issues/71)).
- a nip-05 name points to a key through a web server, which can point it somewhere else later. it's
  resolved once and the key is remembered, so a later change doesn't silently swap who you trust.
  that only protects later lookups. whoever controls the name's domain at the first lookup picks the
  key, and with someone else's follows, every key you'd trust. the key it resolved to is shown, so
  it can be checked against one you got some other way. neither client takes a nip-05 name yet
  ([#71](https://github.com/tinfoilhash/hasheus/issues/71),
  [hasheus-cli#3](https://github.com/tinfoilhash/hasheus-cli/issues/3)).
- requiring several trusted verifiers counts distinct keys, which raises the cost of a single stolen
  key. neither client can require more than one yet
  ([#84](https://github.com/tinfoilhash/hasheus/issues/84),
  [hasheus-cli#13](https://github.com/tinfoilhash/hasheus-cli/issues/13)).

## claimed check methods

verifiers can't say how they checked a file yet
([#78](https://github.com/tinfoilhash/hasheus/issues/78),
[hasheus-cli#8](https://github.com/tinfoilhash/hasheus-cli/issues/8)). once they can, it's their
claim, shown as theirs, and hasheus doesn't check it. it tells you which mistakes and attacks they'd
have caught:

| method               | the verifier says they…                                              | catches                                               | doesn't catch                                                                  |
| -------------------- | -------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| `author`             | made and released the file                                           | a file swapped anywhere after release                 | a compromised build machine or signing key                                     |
| `upstream-signature` | checked it against a signature from the author's key, obtained apart | a download swapped along with its hash                | a stolen upstream key, or the wrong key from the start                         |
| `reproduced-build`   | built it from source themselves and got the same hash                | a release that differs from what its source builds to | malicious source, or a compiler, dependency, or build image their build shared |
| `trusted-copy`       | compared it with a copy they already trusted                         | a swap after they got their copy                      | a copy that was bad from the start                                             |

a verification without a method says nothing about how it was checked. a method is only as good as
the verifier who claims it, and evidence anyone can recheck, like the upstream signature and the key
it was checked against, or the source revision and build inputs, is worth more than the claim alone.

## relay availability

file relays store verifications, and user relays store profiles and follow lists. today the only
default file relay is `wss://relay.hasheus.com`, run by tinfoil hash.

a relay can't forge or change a verification, since each one is signed. it can:

- withhold some or all verifications, so a file looks less verified than it is, or not verified at
  all. withholding can't make a file trusted, but it can change which trusted link is shown.
- go down, or lose what it alone stores.

anyone can also flood a hash with verifications, from as many keys as they like, and a relay can
send as many as it likes. each key counts once, but every verification still has to be fetched and
sorted, and every new key's profile looked up. clients limit the work one lookup can take, and say
when they've stopped short, so a flood shows as an incomplete result, not an empty or endless one.
neither client limits a lookup yet ([#103](https://github.com/tinfoilhash/hasheus/issues/103),
[hasheus-cli#23](https://github.com/tinfoilhash/hasheus-cli/issues/23)).

so:

- no verifications means none were found on the relays that answered, not that none exist. when a
  relay doesn't answer, the lookup is incomplete, and it's shown that way. today, a lookup only
  fails when no file relay answers ([#73](https://github.com/tinfoilhash/hasheus/issues/73),
  [hasheus-cli#5](https://github.com/tinfoilhash/hasheus-cli/issues/5)).
- a relay accepting a verification means it says it stored it, not that it will keep or serve it.
  publishing to more relays, run by different people, is what makes a verification hard to lose or
  hide.

## withdrawals

verifications can't be withdrawn yet ([#57](https://github.com/tinfoilhash/hasheus/issues/57),
[hasheus-cli#14](https://github.com/tinfoilhash/hasheus-cli/issues/14)). once they can, a withdrawal
can promise this much:

- it's signed by the same key and names the hash, so only that key's holder can withdraw it. it
  covers every verification of that hash by that key, earlier or later, since signers set their own
  times and can't put them in order. clients that see it stop counting that key for that file, and
  the same key can't verify the file again.
- it can't erase anything. copies stay on relays, and clients that don't support withdrawals still
  show the verification.
- it's only as visible as the relays that carry it. a relay that withholds a withdrawal makes a
  withdrawn verification look current.
- whoever steals a key can withdraw with it, too, and publish new verifications. a withdrawal can't
  tell you a key is safe again, and recovering from a lost or stolen key needs more than this.

## what you have to trust

- **your computer.** malware can change a file after it's hashed, or change what a client shows.
- **the client you run.** whoever controls hasheus.com, or the cli's releases, can ship a client
  that shows anything as trusted. the cli's releases are verified with hasheus, which helps once you
  have a copy you trust.
- **whatever signs for you:** your browser's signing extension, or the secret key you give the cli.
  either can sign whatever it's asked to.
- **sha-256 and nostr's schnorr signatures**
  ([nip-01](https://github.com/nostr-protocol/nips/blob/master/01.md)), so no other file shares your
  file's hash and no one can sign as someone else.
- **the keys you follow,** held only by the people behind them, and those people's judgment.

you don't have to trust the sites files come from, relays, or verifiers outside your web of trust
for what's true, though you rely on relays to serve it.

## privacy

your file never leaves your computer, only its hash. a hash isn't anonymous, though: anyone with the
file, or who published it, knows which file it is. file relays see the hashes you look up and your
ip address, and user relays see the key you look up trust for.

in the browser, profile pictures load from wherever a profile says, even for unknown verifiers, and
whoever hosts one sees your ip address. someone who hands you a file can verify it with a new key
whose picture is unique to that file, and learn from the picture's host when, and from where, it was
looked up.

a published verification, with its hash, description, url, size, and type, is public and signed with
your key for good.
