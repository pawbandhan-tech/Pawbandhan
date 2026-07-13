'use client';

import { useEffect, useState, useRef } from 'react';

export default function StatsBar() {
  const [stats, setStats] = useState({ rescues: 0, ngos: 0, doctors: 0, riders: 0 });
  const ref = useRef(null);
  const animated = useRef(false);

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(d => {
        setStats({
          rescues: d.rescues || 0,
          ngos: d.ngos || 0,
          doctors: d.doctors || 0,
          riders: d.riders || 0,
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !animated.current) {
        animated.current = true;
        animateStats();
      }
    }, { threshold: 0.3 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  function animateStats() {
    const targets = [stats.rescues, stats.ngos, stats.doctors, stats.riders];
    const els = ref.current?.querySelectorAll('.stat-pill strong');
    if (!els || !els.length) return;
    els.forEach((el, i) => {
      const target = targets[i] || 0;
      let current = 0;
      const step = Math.max(1, Math.ceil(target / 60));
      const interval = setInterval(() => {
        current += step;
        if (current >= target) { current = target; clearInterval(interval); }
        el.textContent = current.toLocaleString('en-IN');
      }, 25);
    });
  }

  return (
    <div ref={ref} className="pb-stats">
      <div className="stat-pill">
        <strong>0</strong>
        <small>Rescues organized</small>
      </div>
      <div className="stat-pill">
        <strong>0</strong>
        <small>NGO partners</small>
      </div>
      <div className="stat-pill">
        <strong>0</strong>
        <small>Vet doctors</small>
      </div>
      <div className="stat-pill">
        <strong>0</strong>
        <small>Field rescuers</small>
      </div>
    </div>
  );
}
