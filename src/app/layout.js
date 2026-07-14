import './globals.css';
import FloatingSupport from '@/components/FloatingSupport';
import SupportWidget from '@/components/SupportWidget';

export const metadata = {
  title: {
    default: 'PawBandhan — Every Paw Matters',
    template: '%s | PawBandhan',
  },
  description: 'India\'s connected animal rescue network. Report, track, and resolve animal rescues with NGOs, veterinarians, and field heroes.',
  keywords: ['animal rescue', 'pet rescue', 'NGO', 'veterinarian', 'India', 'pawbandhan'],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
        />
      </head>
      <body className="pb-public">
        {children}
        <FloatingSupport />
        <dialog id="global-support-dialog" style={{ border: 'none', borderRadius: 16, padding: 0, maxWidth: 700, width: '90vw', maxHeight: '80vh', overflow: 'auto', background: 'var(--color-pb-bg)' }}>
          <div style={{ padding: 24 }}>
            <button style={{ float: 'right', background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }} onClick={() => document.getElementById('global-support-dialog')?.close()}>
              <i className="fas fa-xmark"></i>
            </button>
            <SupportWidget userType="visitor" />
          </div>
        </dialog>
      </body>
    </html>
  );
}
