import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import AboutClient from './AboutClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'About Us — PawBandhan' };

export default function AboutPage() {
  return (
    <>
      <PublicNav />
      <main style={{ minHeight: '100vh', paddingTop: 80 }}>
        <AboutClient />
      </main>
      <PublicFooter />
    </>
  );
}
