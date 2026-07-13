import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import DonatePageClient from './DonatePageClient';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Donate — PawBandhan' };
export default function DonatePage() {
  return (<><PublicNav /><main style={{ minHeight: '100vh', paddingTop: 80 }}><DonatePageClient /></main><PublicFooter /></>);
}
