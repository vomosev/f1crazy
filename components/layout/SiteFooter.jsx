import Link from 'next/link';

const LINK_COLUMNS = [
  {
    heading: 'Race',
    links: [
      { label: 'Start a race', href: '/play' },
      { label: 'Pick a driver', href: '/garage' },
      { label: 'Leaderboard', href: '/leaderboard' },
    ],
  },
  {
    heading: 'Driver',
    links: [
      { label: 'Your profile', href: '/profile' },
      { label: 'Sign in', href: '/login' },
      { label: 'Create account', href: '/signup' },
    ],
  },
  {
    heading: 'Circuit',
    links: [
      { label: 'Grand Hotel Hairpin', href: '/play' },
      { label: 'Nouvelle Chicane', href: '/play' },
      { label: 'Swimming Pool', href: '/play' },
    ],
  },
];

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <p className="footer-wordmark">F1 CRAZY</p>
            <p className="footer-description user-text">
              A single-player arcade dash around the streets of Monaco. Collect bananas,
              pineapples and runaway rubber ducks, dodge the traffic cones, and post a lap
              time worth bragging about in the paddock.
            </p>
          </div>

          {LINK_COLUMNS.map((column) => (
            <nav className="footer-column" key={column.heading} aria-label={column.heading}>
              <p className="footer-heading">{column.heading}</p>
              <ul className="footer-links">
                {column.links.map((link) => (
                  <li key={`${column.heading}-${link.label}`}>
                    <Link className="footer-link" href={link.href}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="footer-bottom">
          <span className="footer-note">&copy; {year} F1 Crazy</span>
          <span className="footer-note">Fan-made arcade game, not affiliated with Formula One</span>
          <span className="footer-note">Scores saved to your account only</span>
        </div>
      </div>
    </footer>
  );
}