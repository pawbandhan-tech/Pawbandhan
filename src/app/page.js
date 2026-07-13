import Link from 'next/link';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import HeroSection from '@/components/HeroSection';
import StatsBar from '@/components/StatsBar';
import HowItWorks from '@/components/HowItWorks';
import PortalsSection from '@/components/PortalsSection';
import StoriesSection from '@/components/StoriesSection';
import ReviewsSection from '@/components/ReviewsSection';
import FaqSection from '@/components/FaqSection';
import CtaBanner from '@/components/CtaBanner';
import AboutSection from '@/components/AboutSection';

export default function HomePage() {
  return (
    <>
      <PublicNav />
      <main>
        <HeroSection />
        <StatsBar />
        <HowItWorks />
        <PortalsSection />
        <StoriesSection />
        <ReviewsSection />
        <FaqSection />
        <CtaBanner />
        <AboutSection />
      </main>
      <PublicFooter />
    </>
  );
}
