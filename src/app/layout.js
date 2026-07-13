import './globals.css';

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
      </body>
    </html>
  );
}
