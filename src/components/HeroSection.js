'use client';

import Link from 'next/link';

export default function HeroSection() {
  return (
    <section className="pb-hero">
      <div className="pb-hero-badge">
        <i className="fas fa-shield-halved"></i>
        India&apos;s Connected Rescue Network
      </div>
      <h1>
        Every rescue is now organized around <span>live updates</span>, clear handoffs, and <span>faster response</span>.
      </h1>
      <p className="pb-hero-sub">
        Report an injured or stray animal, track every step from dispatch to vet care to shelter, and help build a connected rescue network across India.
      </p>
      <div className="pb-hero-actions">
        <Link href="/auth/customer" className="btn btn-primary btn-lg">
          <i className="fas fa-paw"></i> Report emergency
        </Link>
        <a href="mailto:pawbandhan@gmail.com" className="btn btn-white btn-lg">
          <i className="fas fa-phone"></i> Emergency hotline
        </a>
      </div>
    </section>
  );
}
