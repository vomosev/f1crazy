'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from '../SessionProvider';
import Button from '../ui/Button';

const NAV_LINKS = [
  { href: '/play', label: 'Race' },
  { href: '/garage', label: 'Garage' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/profile', label: 'Profile' },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const session = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const status = session?.status || 'guest';
  const user = session?.user || null;

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    function onKeyDown(event) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const isActive = (href) => pathname === href || (href !== '/' && pathname?.startsWith(href + '/'));

  async function handleLogout() {
    if (!session || typeof session.logout !== 'function') return;
    setLoggingOut(true);
    try {
      await session.logout();
    } catch (error) {
      // Logging out should never break the header; the session falls back to guest.
      console.error('Log out failed:', error?.message || error);
    } finally {
      setLoggingOut(false);
      setMenuOpen(false);
    }
  }

  const renderActions = (variantPrefix = '') => {
    if (status === 'loading') {
      return <span className="header-status">Checking pit wall…</span>;
    }
    if (status === 'authenticated' && user) {
      return (
        <>
          <span className="header-user" title={user.username}>
            {user.username}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            loading={loggingOut}
            key={variantPrefix + 'logout'}
          >
            Log out
          </Button>
        </>
      );
    }
    return (
      <>
        <Button as="a" href="/login" variant="ghost" size="sm" key={variantPrefix + 'login'}>
          Sign in
        </Button>
        <Button as="a" href="/signup" variant="primary" size="sm" key={variantPrefix + 'signup'}>
          Sign up
        </Button>
      </>
    );
  };

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link href="/" className="wordmark" aria-label="F1 Crazy home">
          F1 CRAZY
        </Link>

        <nav className="site-nav" aria-label="Main">
          <ul className="nav-list">
            {NAV_LINKS.map((link) => (
              <li key={link.href} className="nav-list__item">
                <Link
                  href={link.href}
                  className={isActive(link.href) ? 'nav-link nav-link--active' : 'nav-link'}
                  aria-current={isActive(link.href) ? 'page' : undefined}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="header-actions">{renderActions('desk-')}</div>

        <button
          type="button"
          className="nav-toggle"
          aria-expanded={menuOpen}
          aria-controls="site-mobile-menu"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
            {menuOpen ? (
              <path
                d="M5 5l14 14M19 5L5 19"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M4 7h16M4 12h16M4 17h16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            )}
          </svg>
        </button>
      </div>

      {menuOpen ? (
        <div className="mobile-menu" id="site-mobile-menu">
          <div className="container mobile-menu__inner">
            <ul className="mobile-menu__list">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={
                      isActive(link.href) ? 'mobile-menu__link mobile-menu__link--active' : 'mobile-menu__link'
                    }
                    aria-current={isActive(link.href) ? 'page' : undefined}
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mobile-menu__actions">{renderActions('mob-')}</div>
          </div>
        </div>
      ) : null}
    </header>
  );
}