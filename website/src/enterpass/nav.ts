import { useEffect, type MouseEvent } from 'react';
import { useLocation } from 'react-router-dom';

// Take the visitor to the secret box: scroll it into view and put the cursor
// in it. When the box isn't on this page, let the link navigate to "#/" and
// ScrollToTop below brings the form into view.
export function goToSecret(event?: MouseEvent) {
  const box = document.getElementById('secret');
  if (!box) {
    if (!event) window.location.hash = '#/';
    return;
  }
  event?.preventDefault();
  const smooth = !window.matchMedia?.('(prefers-reduced-motion: reduce)')
    .matches;
  box.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'center' });
  box.focus({ preventScroll: true });
}

// A link to the page the visitor is already on would do nothing (the hash
// doesn't change), so take them back to the top of it instead.
export function toTopIfSamePage(event: MouseEvent<HTMLAnchorElement>) {
  const target = event.currentTarget.getAttribute('href') ?? '';
  const here = window.location.hash || '#/';
  if (target === here) {
    event.preventDefault();
    const smooth = !window.matchMedia?.('(prefers-reduced-motion: reduce)')
      .matches;
    window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
  }
}

// The hash router keeps the old scroll position on navigation, so a footer
// link would switch pages while leaving the visitor at the footer.
export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
