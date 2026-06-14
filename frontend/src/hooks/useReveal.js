import { useEffect } from 'react';

export function useReveal() {
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.1 }
    );
    document.querySelectorAll('.pb-reveal').forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

export function useJourneyHighlight() {
  useEffect(() => {
    const steps = document.querySelectorAll('.pb-journey-step');
    if (!steps.length) return undefined;
    let idx = 0;
    const id = setInterval(() => {
      steps.forEach((s) => s.classList.remove('active'));
      steps[idx].classList.add('active');
      idx = (idx + 1) % steps.length;
    }, 3200);
    return () => clearInterval(id);
  }, []);
}
