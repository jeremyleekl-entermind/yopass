import { useEffect, useRef, useState } from 'react';

function reducedMotion() {
  return (
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  );
}

// Marks the document as script-enabled so entrances may start hidden; without
// script (or before this runs) every section is simply visible.
export function useMotionReady() {
  useEffect(() => {
    document.documentElement.classList.add('ep-js');
  }, []);
}

// Adds .is-in once the element enters the viewport; its children then rise in
// a 80ms stagger (enterpass.css .ep-rise).
export function useRise<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reducedMotion() || !('IntersectionObserver' in window)) {
      el.classList.add('is-in');
      return;
    }
    const io = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

// Cycles 0..count-1 every `ms`, paused while the tab is hidden and frozen on
// the first state under reduced motion.
export function useCycle(count: number, ms: number) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (reducedMotion()) return;
    const id = window.setInterval(() => {
      if (!document.hidden) setIndex(i => (i + 1) % count);
    }, ms);
    return () => window.clearInterval(id);
  }, [count, ms]);
  return index;
}
