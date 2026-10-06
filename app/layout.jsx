import './globals.css';
import { SessionProvider } from '../components/SessionProvider';
import SiteHeader from '../components/layout/SiteHeader';
import SiteFooter from '../components/layout/SiteFooter';

export const metadata = {
  title: 'F1 Crazy — Monaco Street Scramble',
  description:
    'Race zany drivers around a stylised Monaco street circuit, scoop up bananas, pineapples and rubber ducks, and climb the global leaderboard.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0b0e14',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <div className="shell">
            <a className="skip-link" href="#main-content">
              Skip to content
            </a>
            <SiteHeader />
            <main id="main-content" className="container page">
              {children}
            </main>
            <SiteFooter />
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}