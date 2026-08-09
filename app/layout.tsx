import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/react';
import '../src/index.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://hyperlink.hyper.co.ke'),
  title: {
    default: 'Hyperlink Social Connect | Connect, Create, Belong',
    template: '%s | Hyperlink Social Connect',
  },
  description: 'Connect with friends, share moments, discover people, and build community with Hyperlink Social Connect.',
  keywords: ['Hyperlink Social Connect', 'social network', 'online community', 'connect with friends', 'messaging', 'discover people', 'share moments'],
  authors: [{ name: 'Steve Nganga' }],
  applicationName: 'Hyperlink Social Connect',
  alternates: {
    canonical: 'https://hyperlink.hyper.co.ke/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    url: 'https://hyperlink.hyper.co.ke/',
    title: 'Hyperlink Social Connect | Connect, Create, Belong',
    description: 'Connect with friends, share moments, discover people, and build community with Hyperlink Social Connect.',
    siteName: 'Hyperlink Social Connect',
    locale: 'en_US',
    images: [
      {
        url: 'https://hyperlink.hyper.co.ke/steve01.jpeg',
        width: 3120,
        height: 4160,
        alt: 'hyperlink social connect',
        type: 'image/jpeg',
        secureUrl: 'https://hyperlink.hyper.co.ke/steve01.jpeg',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hyperlink Social Connect | Connect, Create, Belong',
    description: 'Connect with friends, share moments, discover people, and build community with Hyperlink Social Connect.',
    images: ['https://hyperlink.hyper.co.ke/steve01.jpeg'],
  },
  // Structured data is also injected via JSON-LD script below for backwards compatibility with Vite's index.html
};

export const viewport: Viewport = {
  themeColor: '#312e81',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google Tag Manager + gtag (preserved from Vite's index.html) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-FEDEQ33Z6X" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-FEDEQ33Z6X');
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-5RVCRR38');`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'Hyperlink Social Connect',
              url: 'https://hyperlink.hyper.co.ke/',
              description: 'Connect with friends, share moments, discover people, and build community with Hyperlink Social Connect.',
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'Hyperlink Social Connect',
              url: 'https://hyperlink.hyper.co.ke/',
              applicationCategory: 'SocialNetworking',
              operatingSystem: 'Web',
              description: 'Connect with friends, share moments, discover people, and build community with Hyperlink Social Connect.',
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
            }),
          }}
        />
        {/* Dark mode flash prevention (mirrors original useDarkMode default=true) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{(function(){var s=localStorage.getItem('darkMode');var d=s!==null?s==='true':true;if(d)document.documentElement.classList.add('dark');})()}catch(e){}`,
          }}
        />
      </head>
      <body>
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-5RVCRR38"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
