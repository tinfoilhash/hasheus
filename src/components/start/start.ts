import '@/components/app/app_header'
import '@/components/base/command'
import '@/components/base/tag'
import cssNormalize from '@/components/base/css/css_normalize'
import cssPage from '@/components/base/css/css_page'
import '@/components/start/file_drop'
import { css, html, LitElement, type TemplateResult } from 'lit'

class HStart extends LitElement {
  override render() {
    return html`
      ${this.#renderHero()} ${this.#renderSection('the problem', this.#renderProblem())}
      ${this.#renderSection('how it works', this.#renderHowItWorks())}
      ${this.#renderSection("why it's different", this.#renderWhyDifferent())}
      ${this.#renderSection('what trusted means', this.#renderTrustedMeaning())}
      ${this.#renderSection('made it or checked it? verify it', this.#renderVerifyIt())}
      ${this.#renderSection('questions', this.#renderQuestions())}
    `
  }

  #renderHero() {
    return html`
      <section class="head margined">
        <h-app-header></h-app-header>
        <div class="body">
          <h2>is this the file you think it is?</h2>
          <p class="intro">
            a download, a photo, a video, a document someone sent you: don't take its source's word
            for it. see who has verified your exact file, and whether that includes people you
            follow. it's free and
            <a href="https://github.com/tinfoilhash/hasheus" target="_blank">open source</a>, with
            no trackers and no sign-up, and your file never leaves your computer.
          </p>
          <h-file-drop></h-file-drop>
          <p class="cli">
            or
            <a href="https://github.com/tinfoilhash/hasheus-cli" target="_blank">install the cli</a>
            and run ${this.#renderCommand('hasheus verify <file>')} in a terminal.
          </p>
        </div>
      </section>
    `
  }

  #renderSection(heading: string, content: TemplateResult) {
    return html`
      <section class="margined">
        <h3>${heading}</h3>
        <div class="body">${content}</div>
      </section>
    `
  }

  #renderCommand(command: string) {
    return html`<h-command .command=${command}></h-command>`
  }

  #renderTrusted(text = 'trusted') {
    return html`<h-tag kind="trusted">${text}</h-tag>`
  }

  #renderUnknown() {
    return html`<h-tag kind="unknown">unknown</h-tag>`
  }

  #renderProblem() {
    return html`
      <p>
        a hash is a fingerprint of a file: change one byte, and it changes. sources list one so you
        can check your copy against it. but whoever takes over the site or account sharing a file
        can swap the file and its hash together, and they'll still match. in 2016, attackers took
        over linux mint's site and
        <a href="https://blog.linuxmint.com/?p=2994" target="_blank"
          >pointed its downloads at a backdoored installer</a
        >, and they could edit the checksums beside it, too.
      </p>
      <p>
        hasheus checks signatures instead of the source's word. when a file's author has verified
        it, you'll find their signed word here, along with everyone else's verifications of it.
        verifications from people you follow are marked ${this.#renderTrusted()}.
      </p>
    `
  }

  #renderHowItWorks() {
    return html`
      <ol>
        <li>
          <strong>hash a file.</strong> drop it anywhere, or run
          ${this.#renderCommand('hasheus verify <file>')}. its sha-256 hash is worked out on your
          computer.
        </li>
        <li>
          <strong>see who has verified it.</strong> a verification is a signed note linking that
          hash to a description and a url for the file. the signature proves whose key published it,
          not whether or how they checked the file. hasheus is new, so your file may have none yet.
          if you can vouch for it, yours can be the first.
        </li>
        <li>
          <strong>see which verifiers you follow.</strong> hasheus is built on nostr, an open
          protocol where your identity is a key you hold, not an account a company owns. you follow
          people in any nostr app, and hasheus marks verifications from you and the people you
          follow as ${this.#renderTrusted()}. to see which are trusted, connect your nostr profile
          on a file's result page, or give the cli your public key (setup is below).
        </li>
      </ol>
      <p>
        say you follow an app's developer, who verifies each release. download an installer, from
        their site or a mirror, and their verification shows up ${this.#renderTrusted()}. two
        friends you follow verified it with the same url, so that url shows
        ${this.#renderTrusted('+2 trusted')}. check the description against the release you meant to
        get: you have the author's signed word about your exact file.
      </p>
    `
  }

  #renderWhyDifferent() {
    return html`
      <ul>
        <li>
          <strong>the author's word, without the hunt.</strong> when authors verify their own files,
          hasheus finds them by your file's hash: no signature files to download, no keys to import,
          no comparing hashes by hand.
          <a href="https://github.com/tinfoilhash/hasheus-cli/releases" target="_blank"
            >the cli's own releases</a
          >
          are verified this way.
        </li>
        <li>
          <strong>everyone else's, too.</strong> you also see everyone else who has verified the
          file, and which of them you follow, so you have more to go on, even when the author hasn't
          verified it.
        </li>
        <li>
          <strong>taking over a source doesn't take over keys.</strong> anyone can publish a
          verification, including someone pushing a fake file, but unless it's signed by you or
          someone you follow, it shows up as ${this.#renderUnknown()}.
        </li>
        <li>
          <strong>you choose whose word counts,</strong> by who you follow, not an app store or a
          certificate authority.
        </li>
      </ul>
    `
  }

  #renderTrustedMeaning() {
    return html`
      <p>
        your web of trust is you and the people you follow, including people you follow for memes.
        trust follows keys, so copying someone's name or picture doesn't count. a trusted
        verification is only as good as the person behind it.
      </p>
      <p>
        ${this.#renderUnknown()} means you haven't connected, or the verifier is outside your web of
        trust. it doesn't mean the file is bad. a trusted verification gives you a second source to
        judge, not proof the file is official, current, or safe, and hasheus isn't a virus scanner.
        if there are no verifications at all, the question is still open.
      </p>
    `
  }

  #renderVerifyIt() {
    return html`
      <p>
        if you made the file, verify it yourself, so people who follow you see it trusted, wherever
        they got it. if you've checked someone else's file, say against a copy you already trust,
        add your verification. people who follow you will see it trusted, too.
      </p>
      <p>
        connect and add yours on its result page, or run
        ${this.#renderCommand('hasheus publish <file> --url <url>')}. getting a file from the
        official site alone isn't enough: that's what attackers can take over. your verification is
        public and signed with your key, so only vouch for what you've checked.
      </p>
    `
  }

  #renderQuestions() {
    return html`
      ${this.#renderQuestion(
        'is my file uploaded?',
        html`
          no. its hash is computed on your computer, in your browser or the cli, and only the hash
          is sent to hasheus's relay, the server that stores verifications. profiles, and your
          follow list when you connect, are fetched from public nostr relays. if you publish a
          verification, its hash, description, url, size, and type are public.
        `,
      )}
      ${this.#renderQuestion(
        'how do i connect?',
        html`
          you don't need to connect to look up a file. connecting marks which verifications come
          from people you follow, and for that you'll need a nostr profile. if you're new, create
          one in a nostr app that lets you choose who to follow. in the browser, use that same
          identity in a signing extension such as
          <a href="https://github.com/fiatjaf/nos2x" target="_blank">nos2x</a>, then choose a file
          and click connect on its result page. these extensions mostly run on desktop browsers. in
          the cli, set ${this.#renderCommand('HASHEUS_PUBLIC_KEY')} to your public key, and
          ${this.#renderCommand('hasheus publish')} asks for your secret key when you add a
          verification. <a href="https://nostr.com" target="_blank">learn more</a>
        `,
      )}
      ${this.#renderQuestion(
        'does it work for photos and videos?',
        html`
          yes, for any file. but a hash covers the exact file, so a copy that's been resized,
          recompressed, or stripped of its metadata, as many sites do on upload, won't match the
          original.
        `,
      )}
      ${this.#renderQuestion(
        'which url does it show?',
        html`
          the one shared by the largest number of trusted verifiers: you and the people you follow.
          if there are no trusted verifications, it shows an unknown verifier's url, marked
          ${this.#renderUnknown()}.
        `,
      )}
      ${this.#renderQuestion(
        'can i share a result?',
        html`
          yes. every file gets its own page here, so copy its address to send someone the
          verifications without sending the file.
        `,
      )}
      ${this.#renderQuestion(
        'where are verifications stored?',
        html`
          on hasheus's relay by default. they're signed and in an open format, so any relay can
          store copies.
        `,
      )}
    `
  }

  #renderQuestion(question: string, answer: TemplateResult) {
    return html`
      <details>
        <summary>${question}</summary>
        <p>${answer}</p>
      </details>
    `
  }

  static override styles = [
    cssNormalize,
    cssPage,
    css`
      section:not(.head) {
        padding-block: 2.5rem;
        border-top: 1px solid var(--h-color-800);
      }

      /* the footer brings its own space. */
      section:last-of-type {
        padding-bottom: 0;
      }

      h3 {
        margin: 0 0 1rem;
        font-family: var(--h-font-mono);
        font-size: 0.875rem;
        font-weight: inherit;
        line-height: 1.375rem;
        color: var(--h-color-400);
      }

      strong {
        font-weight: 600;
        color: var(--h-color-100);
      }

      ol,
      ul {
        padding-left: 1.5rem;
      }

      li + li {
        margin-top: 0.75rem;
      }

      ol li::marker {
        font-family: var(--h-font-mono);
        color: var(--h-color-terracotta);
      }

      ul li::marker {
        color: var(--h-color-600);
      }

      .intro {
        color: var(--h-color-100);
      }

      .body > h-file-drop {
        margin-top: 1.5rem;
      }

      .cli {
        font-size: 0.875rem;
        line-height: 1.375rem;
        color: var(--h-color-400);
      }

      .cli a {
        color: var(--h-color-300);
      }

      details + details {
        margin-top: 0.75rem;
      }

      summary {
        color: var(--h-color-100);
        cursor: pointer;
      }

      /* light enough to read as the question's open or closed state. */
      summary::marker {
        color: var(--h-color-500);
      }

      /* lines up with the question, past its marker. */
      details p {
        padding-left: 1.125rem;
        margin-top: 0.5rem;
      }

      @media (width >= 48rem) {
        section:not(.head) {
          padding-block: 3rem;
        }

        h3 {
          padding-top: 0.125rem;
          margin: 0;
        }
      }
    `,
  ]
}

customElements.define('h-start', HStart)

declare global {
  interface HTMLElementTagNameMap {
    'h-start': HStart
  }
}

export default HStart
