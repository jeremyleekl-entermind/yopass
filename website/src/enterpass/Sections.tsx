import {
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from 'react';
import { generatePassword } from '@shared/lib/passwordGenerator';
import { useRise } from './motion';

// How it works: the same pass in four fields, further along each time.
const STEPS = [
  {
    label: 'Your secret',
    text: 'wifi: Gr33n-Owl-2026',
    stub: '1 day',
    clause: 'First you write it, in this browser.',
  },
  {
    label: 'Locked',
    text: '-----BEGIN PGP MESSAGE----- wy4ECQMIRthQ3aO8',
    stub: 'Key: yours',
    clause: 'Then your browser locks it with a new key.',
  },
  {
    label: 'The link',
    text: '/#/s/3a8WJPV8er3Pbh/k9QzT',
    stub: 'Admit one',
    clause: 'Then the link travels. The key rides after the #.',
  },
  {
    label: 'Opened',
    text: 'Secret does not exist',
    stub: 'Used',
    clause: 'Then it is read once, and it is gone.',
  },
];

export function HowItWorks() {
  const ref = useRise<HTMLElement>();
  return (
    <section ref={ref} className="ep-section ep-fields ep-rise">
      {STEPS.map((step, i) => (
        <div key={step.label} className="ep-f">
          {i === 0 && <h2 className="ep-display">How a pass works</h2>}
          <div className="ep-f-card ep-pass" data-ui>
            <div className="ep-f-main">
              <b>{step.label}</b>
              {step.text}
            </div>
            <div className="ep-f-stub">{step.stub}</div>
          </div>
          <p className="ep-f-clause">{step.clause}</p>
        </div>
      ))}
    </section>
  );
}

// Features: close-ups of real parts of the interface, enlarged and cropped.
export function Board() {
  const ref = useRise<HTMLElement>();
  return (
    <section
      ref={ref}
      className="ep-section ep-board ep-rise"
      aria-labelledby="ep-board-title"
    >
      <div className="ep-tile ep-w6h2 ep-c-step ep-heading">
        <h2 id="ep-board-title" className="ep-display">
          Built to forget
        </h2>
      </div>
      <Tile
        size="ep-w3h4"
        colour="ep-c-night"
        name="Read once"
        line="The first reader takes it. Everyone after sees nothing."
      >
        <div data-ui style={{ fontSize: '320%', top: '14%', right: '0.25em' }}>
          <span style={toggleTrack}>
            <span style={toggleKnob} />
          </span>
        </div>
      </Tile>
      <Tile
        size="ep-w3h4"
        colour="ep-c-paper"
        name="Password generator"
        line="4 to 64 characters from your device's own random source."
      >
        <div
          data-ui
          style={{ fontSize: '300%', top: '10%', left: '18%', width: '6em' }}
        >
          <div
            style={{
              height: '0.18em',
              background: 'var(--ep-paper-step)',
              position: 'relative',
            }}
          >
            <span
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '58%',
                background: 'var(--ep-blue)',
              }}
            />
            <span style={sliderThumb} />
          </div>
          <div style={{ marginTop: '0.4em', fontSize: '1.4em' }}>20</div>
        </div>
      </Tile>
      <Tile
        size="ep-w6h4"
        colour="ep-c-blue"
        name="Three lifetimes"
        line="An hour, a day or a week. Then it is deleted, read or not."
      >
        <div
          data-ui
          style={{
            fontSize: '360%',
            top: '12%',
            left: '-0.3em',
            display: 'flex',
            gap: '0.25em',
          }}
        >
          {['1h', '1d', '1w'].map(k => (
            <span key={k} style={k === '1d' ? keyCapOn : keyCap}>
              {k}
            </span>
          ))}
        </div>
      </Tile>
      <Tile
        size="ep-w3h2"
        colour="ep-c-green"
        name="Key after the #"
        line="Browsers never send that part of a link to a server."
      >
        <div
          data-ui
          style={{
            fontSize: '900%',
            lineHeight: 0.8,
            top: '-0.12em',
            right: '0.05em',
          }}
        >
          #
        </div>
      </Tile>
      <Tile
        size="ep-w3h2"
        colour="ep-c-navy"
        name="Self-destructs"
        line="Deleted when read, or when its time runs out."
      >
        <div
          data-ui
          style={{
            fontSize: '300%',
            top: '0.25em',
            right: '-0.4em',
            background: 'var(--ep-green)',
            color: 'var(--ep-ink)',
            padding: '0.1em 0.4em',
          }}
        >
          Gone
        </div>
      </Tile>
      <Tile
        size="ep-w6h2"
        colour="ep-c-step"
        name="Ten thousand characters"
        line="Room for a password, a note or a private key."
      >
        <div
          data-ui
          style={{
            fontSize: '640%',
            lineHeight: 0.8,
            top: '-0.08em',
            right: '-0.12em',
            color: 'var(--ep-blue)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          10,000
        </div>
      </Tile>
      <Tile
        size="ep-w3h2"
        colour="ep-c-night"
        name="One-click link"
        line="Or send the link and the key apart."
      >
        <div
          data-ui
          style={{
            fontSize: '260%',
            top: '0.3em',
            right: '-0.5em',
            background: 'var(--ep-blue)',
            color: '#fff',
            padding: '0.15em 0.5em',
          }}
        >
          Copy link
        </div>
      </Tile>
      <Tile
        size="ep-w3h2"
        colour="ep-c-blue"
        name="No accounts"
        line="Nothing to sign up for. Nothing about you is kept."
      >
        <div
          data-ui
          style={{
            fontSize: '900%',
            lineHeight: 0.8,
            top: '-0.1em',
            right: '0.04em',
          }}
        >
          0
        </div>
      </Tile>
    </section>
  );
}

function Tile({
  size,
  colour,
  name,
  line,
  children,
}: {
  size: string;
  colour: string;
  name: string;
  line: string;
  children: ReactNode;
}) {
  return (
    <div className={`ep-tile ${size} ${colour}`}>
      {children}
      <p className="ep-tile-cap">
        <b>{name}</b>
        <span>{line}</span>
      </p>
    </div>
  );
}

const toggleTrack: CSSProperties = {
  display: 'block',
  width: '2.2em',
  height: '1.1em',
  background: 'var(--ep-green)',
  borderRadius: '1em',
  position: 'relative',
};
const toggleKnob: CSSProperties = {
  position: 'absolute',
  top: '0.12em',
  right: '0.12em',
  width: '0.86em',
  height: '0.86em',
  borderRadius: '50%',
  background: 'var(--ep-ink)',
};
const sliderThumb: CSSProperties = {
  position: 'absolute',
  left: '58%',
  top: '50%',
  width: '0.7em',
  height: '0.7em',
  marginLeft: '-0.35em',
  marginTop: '-0.35em',
  borderRadius: '50%',
  background: 'var(--ep-blue)',
};
const keyCap: CSSProperties = {
  display: 'inline-block',
  padding: '0.2em 0.45em',
  background: 'rgba(255,255,255,0.16)',
};
const keyCapOn: CSSProperties = {
  ...keyCap,
  background: '#ffffff',
  color: 'var(--ep-blue)',
};

// Closing sentence with a blank: the length is the input, "please" makes the
// password, here, from the same generator as the full page.
export function PasswordCta() {
  const ref = useRise<HTMLElement>();
  const [length, setLength] = useState('20');
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);

  function make(event: FormEvent) {
    event.preventDefault();
    const n = Math.min(64, Math.max(4, Number(length) || 20));
    setLength(String(n));
    setCopied(false);
    setPassword(
      generatePassword({
        length: n,
        lowercase: true,
        uppercase: true,
        numbers: true,
        symbols: true,
        excludeAmbiguous: true,
        noDuplicates: false,
      }),
    );
  }

  return (
    <section ref={ref} className="ep-section ep-cta ep-rise">
      <form onSubmit={make}>
        <h2 className="ep-display">
          Need a password?{' '}
          <input
            type="number"
            min={4}
            max={64}
            inputMode="numeric"
            aria-label="Password length, 4 to 64"
            value={length}
            onChange={e => setLength(e.target.value)}
          />{' '}
          characters, <button type="submit">please</button>
        </h2>
      </form>
      <div className="ep-cta-result" aria-live="polite">
        {password ? (
          <>
            <code>{password}</code>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                void navigator.clipboard?.writeText(password);
                setCopied(true);
              }}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </>
        ) : (
          <p>
            Made in this browser from its own random source. Nothing is sent
            anywhere. More options on the{' '}
            <a className="link" href="#/generate">
              password generator
            </a>
            .
          </p>
        )}
      </div>
    </section>
  );
}

// The idea is older than software: a ticket was good for one journey,
// punched at the gate and worthless after. Real pictures, credited below them.
export function TicketHistory() {
  const ref = useRise<HTMLElement>();
  return (
    <section
      ref={ref}
      className="ep-section ep-history ep-rise"
      aria-labelledby="ep-history-title"
    >
      <div className="ep-history-text">
        <h2 id="ep-history-title" className="ep-display">
          A ticket&rsquo;s whole life
        </h2>
        <p className="ep-statement">
          A ticket was good for one journey: punched at the gate, worthless
          after. EnterPass gives a password the same life.
        </p>
        <p className="ep-credits">
          Pictures:{' '}
          <a href="https://commons.wikimedia.org/w/index.php?curid=27703436">
            Edmondson railway tickets
          </a>{' '}
          by SSR2000,{' '}
          <a href="https://creativecommons.org/licenses/by-sa/3.0/">
            CC BY-SA 3.0
          </a>
          ;{' '}
          <a href="https://commons.wikimedia.org/w/index.php?curid=82164003">
            Ticket Punch
          </a>{' '}
          (c. 1938) by H. Langden Brown, National Gallery of Art, CC0;{' '}
          <a href="https://commons.wikimedia.org/w/index.php?curid=1827053">
            Kuala Lumpur railway station
          </a>{' '}
          by Two hundred percent,{' '}
          <a href="https://creativecommons.org/licenses/by-sa/3.0/">
            CC BY-SA 3.0
          </a>
          . All via Wikimedia Commons.
        </p>
      </div>
      <figure className="ep-photo ep-photo-main ep-pass">
        <img
          src="/img/edmondson-tickets.jpg"
          width={1400}
          height={1050}
          loading="lazy"
          alt="A spread of punched Edmondson card railway tickets, each valid for one journey"
        />
      </figure>
      <figure className="ep-photo ep-photo-punch ep-pass">
        <img
          src="/img/ticket-punch.jpg"
          width={900}
          height={663}
          loading="lazy"
          alt="A 1938 watercolour of a conductor's ticket punch with its counting dial"
        />
      </figure>
      <figure className="ep-photo ep-photo-station ep-pass">
        <img
          src="/img/kl-station.jpg"
          width={1200}
          height={899}
          loading="lazy"
          alt="The platforms and ticket gates under the iron roof of the old Kuala Lumpur railway station"
        />
      </figure>
    </section>
  );
}
