import { useRise } from './motion';
import { goToSecret, toTopIfSamePage } from './nav';

// The name closes the page as a construction: each letter knocked out of its
// own block, blocks of different heights on one baseline.
const LETTERS = [
  ['E', 88, 'var(--ep-navy)'],
  ['N', 70, 'var(--ep-navy)'],
  ['T', 100, 'var(--ep-navy)'],
  ['E', 62, 'var(--ep-navy)'],
  ['R', 80, 'var(--ep-navy)'],
  ['P', 100, 'var(--ep-blue)'],
  ['A', 74, 'var(--ep-blue)'],
  ['S', 92, 'var(--ep-blue)'],
  ['S', 66, 'var(--ep-green)'],
] as const;

export function EnterFooter({
  privacyUrl,
  imprintUrl,
  privacyLabel,
  imprintLabel,
}: {
  privacyUrl?: string;
  imprintUrl?: string;
  privacyLabel: string;
  imprintLabel: string;
}) {
  const ref = useRise<HTMLDivElement>();
  return (
    <footer className="ep-foot">
      <div ref={ref} className="ep-mark ep-rise" aria-label="EnterPass">
        {LETTERS.map(([letter, height, colour], i) => (
          <span
            key={i}
            aria-hidden="true"
            style={{
              height: `${height}%`,
              background: colour,
              color: colour === 'var(--ep-green)' ? 'var(--ep-ink)' : '#fff',
            }}
          >
            {letter}
          </span>
        ))}
      </div>

      <div className="ep-foot-cols">
        <div>
          <b>EnterPass</b>
          <ul>
            <li>
              <a href="#/" onClick={goToSecret}>
                Send a secret
              </a>
            </li>
            <li>
              <a href="#/generate" onClick={toTopIfSamePage}>
                Password generator
              </a>
            </li>
          </ul>
        </div>
        <div>
          <b>Entermind</b>
          <ul>
            <li>
              <a
                href="https://entermind.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                entermind.com
              </a>
            </li>
            <li>
              <a href="mailto:newbiz@entermind.com">newbiz@entermind.com</a>
            </li>
          </ul>
        </div>
        <div>
          <b>Privacy</b>
          <ul>
            <li>Encrypted in your browser</li>
            <li>No accounts, no tracking</li>
          </ul>
        </div>
        <div>
          <b>Kuala Lumpur</b>
          <p>
            Level 6, Tower 9, Avenue 5, The Horizon, Bangsar South, 59200 Kuala
            Lumpur
          </p>
        </div>
      </div>

      <div className="ep-foot-legal">
        {/* Kept as one row: the upstream footer specs read it as a whole. */}
        <div className="flex flex-wrap items-center gap-2">
          {privacyUrl && privacyUrl.trim() && (
            <>
              <a href={privacyUrl} target="_blank" rel="noopener noreferrer">
                {privacyLabel}
              </a>
              <span>•</span>
            </>
          )}
          {imprintUrl && imprintUrl.trim() && (
            <>
              <a href={imprintUrl} target="_blank" rel="noopener noreferrer">
                {imprintLabel}
              </a>
              <span>•</span>
            </>
          )}
          <span>
            &copy; {new Date().getFullYear()}{' '}
            <a
              href="https://entermind.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Entermind
            </a>
          </span>
        </div>
        <a className="ep-top" href="#/" onClick={goToSecret}>
          Send a secret
        </a>
      </div>
    </footer>
  );
}
