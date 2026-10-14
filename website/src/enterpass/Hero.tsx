import { useCycle } from './motion';

// The barcode band across the top of the card: the pass's own stripe, built
// from filled bars whose widths spell ENTERPASS in bits.
const BARS = [...'ENTERPASS'].flatMap(ch =>
  [...ch.charCodeAt(0).toString(2).padStart(7, '0')].map(bit =>
    bit === '1' ? 9 : 3,
  ),
);

export function Barcode() {
  return (
    <div className="ep-barcode" aria-hidden="true">
      {BARS.map((w, i) => (
        <span key={i} style={{ width: w }} />
      ))}
    </div>
  );
}

const STATES = [
  {
    id: 'written',
    title: 'Admit one',
    line: 'wifi: Gr33n-Owl-2026',
    stub: '1 day',
  },
  {
    id: 'locked',
    title: 'Locked',
    line: '-----BEGIN PGP MESSAGE----- wy4ECQMIRthQ3aO85NvgAfASIX3dTw',
    stub: 'Key: yours',
  },
  {
    id: 'sent',
    title: 'On its way',
    line: 'pass.entermind.my/#/s/3a8WJPV8er3PbhVINBL0JY',
    stub: '1 read',
  },
  {
    id: 'gone',
    title: 'Gone',
    line: 'Read once. Nothing left to read.',
    stub: 'Used',
  },
] as const;

// The sticky blue field beside the card: the headline, one sentence, and the
// pass at enormous scale, cropped by the field and changing state like light
// shifting in a room (the direction's slow crossfade).
export function HeroField() {
  const on = useCycle(STATES.length, 5600);
  return (
    <aside className="ep-field" aria-labelledby="ep-hero-title">
      <h1 id="ep-hero-title" className="ep-display">
        One link.
        <br />
        One read.
      </h1>
      <p className="ep-lead">
        Paste a password, send the link, and it destroys itself the moment it is
        read.
      </p>
      {/* Phones: the form sits below this field, so offer the way to it. */}
      <button
        type="button"
        className="ep-jump"
        onClick={() => {
          const box = document.getElementById('secret');
          box?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          box?.focus({ preventScroll: true });
        }}
      >
        Write a secret
      </button>
      <div className="ep-giant ep-pass" aria-hidden="true">
        {STATES.map((s, i) => (
          <div
            key={s.id}
            data-ui
            data-state={s.id}
            className={`ep-giant-state${i === on ? ' is-on' : ''}`}
          >
            <div className="ep-giant-main">
              <strong>{s.title}</strong>
              <span>{s.line}</span>
            </div>
            <div className="ep-giant-stub">{s.stub}</div>
          </div>
        ))}
      </div>
    </aside>
  );
}
