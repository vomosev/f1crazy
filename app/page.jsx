import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import LeaderboardTable from '../components/leaderboard/LeaderboardTable';
import ItemIcon from '../components/game/ItemIcon';
import { ITEMS } from '../lib/game/items';

export const metadata = {
  title: 'F1 Crazy — Monaco Street Scramble',
  description:
    'Race a zany driver through the streets of Monaco, hoover up bananas, pineapples and rubber ducks, and bank your score on the global leaderboard.',
};

const HOW_IT_WORKS = [
  {
    title: 'Pick your driver',
    body: 'Six certified oddballs wait in the garage, from Banana Baron to Sir Honks-a-Lot. Each one trades top speed against handling and luck, so the grid never feels the same twice.',
    step: '01',
  },
  {
    title: 'Three laps of Monaco',
    body: 'Sainte-Dévote, the Grand Hotel Hairpin, the tunnel and the Swimming Pool chicanes are all here. Clip the barriers and you scrub speed, so smooth beats brave.',
    step: '02',
  },
  {
    title: 'Hoard the silly stuff',
    body: 'Fruit, baguettes and mystery crates litter the racing line. Collect them for points, dodge the traffic cones, and push your best run onto the leaderboard.',
    step: '03',
  },
];

const FEATURED_SLUGS = [
  'banana',
  'pineapple',
  'rubber-duck',
  'flying-baguette',
  'golden-pineapple',
  'mystery-crate',
];

export default function HomePage() {
  const featured = FEATURED_SLUGS.map((slug) =>
    ITEMS.find((item) => item.slug === slug)
  ).filter(Boolean);

  return (
    <div className="home">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero__copy">
          <p className="hero__eyebrow">Single player · Monaco street circuit</p>
          <h1 id="hero-title">Monaco Street Scramble</h1>
          <p className="hero__lede">
            Thread a cartoon racer through the harbour, the hairpin and the tunnel
            while the principality fills up with runaway fruit. Three laps, one
            score, zero sponsors telling you to calm down.
          </p>
          <div className="hero__actions">
            <Button href="/play" variant="primary" size="lg">
              Start a race
            </Button>
            <Button href="/garage" variant="secondary" size="lg">
              Choose a driver
            </Button>
          </div>
          <ul className="hero__facts">
            <li>12 corners recreated from the real circuit</li>
            <li>7 collectables, 1 hazard, plenty of regret</li>
            <li>Keyboard and touch controls</li>
          </ul>
        </div>
        <div className="hero__art" aria-hidden="true">
          <svg viewBox="0 0 320 200" role="presentation" focusable="false">
            <defs>
              <linearGradient id="heroSky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-surface-raised)" />
                <stop offset="100%" stopColor="var(--color-surface)" />
              </linearGradient>
            </defs>
            <rect x="0" y="0" width="320" height="200" fill="url(#heroSky)" />
            <path
              d="M30 160 C 60 90, 110 70, 150 100 S 230 150, 290 90"
              fill="none"
              stroke="var(--color-border)"
              strokeWidth="22"
              strokeLinecap="round"
            />
            <path
              d="M30 160 C 60 90, 110 70, 150 100 S 230 150, 290 90"
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="3"
              strokeDasharray="10 12"
              strokeLinecap="round"
            />
            <rect
              x="138"
              y="84"
              width="28"
              height="14"
              rx="5"
              fill="var(--color-accent)"
            />
            <circle cx="144" cy="100" r="5" fill="var(--color-text)" />
            <circle cx="162" cy="100" r="5" fill="var(--color-text)" />
            <circle cx="262" cy="104" r="9" fill="var(--color-warning)" />
            <circle cx="74" cy="128" r="7" fill="var(--color-success)" />
          </svg>
        </div>
      </section>

      <section className="home-section" aria-labelledby="how-title">
        <h2 id="how-title">How a run works</h2>
        <p>
          No tutorials, no menus to grind through. Press start, hold the throttle
          and try to keep the barriers out of your paintwork.
        </p>
        <div className="card-grid">
          {HOW_IT_WORKS.map((step) => (
            <Card key={step.step} title={step.title} subtitle={`Step ${step.step}`}>
              <p>{step.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="home-section" aria-labelledby="items-title">
        <h2 id="items-title">The crazy haul</h2>
        <p>
          Everything scattered around the circuit is worth something — except the
          traffic cones, which are worth considerably less than nothing.
        </p>
        <ul className="item-strip">
          {featured.map((item) => (
            <li key={item.slug} className="item-strip__item">
              <span className="item-strip__icon">
                <ItemIcon slug={item.slug} size={32} title={item.name} />
              </span>
              <span className="item-strip__text">
                <span className="item-strip__name user-text">{item.name}</span>
                <span className="item-strip__points">
                  {item.isHazard
                    ? `${item.points} pts`
                    : item.slug === 'mystery-crate'
                      ? 'Random pts'
                      : `+${item.points} pts`}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="home-section" aria-labelledby="board-title">
        <h2 id="board-title">Fastest in the principality</h2>
        <p>
          The top five scores across every driver. Beat them and your name lands
          here the moment your race is saved.
        </p>
        <Card
          title="Top 5 this week"
          subtitle="Updated after every saved race"
          actions={
            <Button href="/leaderboard" variant="ghost" size="sm">
              Full board
            </Button>
          }
        >
          <LeaderboardTable mode="preview" range="week" limit={5} />
        </Card>
      </section>

      <section className="home-cta" aria-labelledby="cta-title">
        <h2 id="cta-title">Ready for the hairpin?</h2>
        <p>
          Create an account to keep your points, unlock the stranger drivers and
          fill a garage shelf with pineapples. Guests can race too — the score
          just stays on this device.
        </p>
        <div className="hero__actions">
          <Button href="/play" variant="primary" size="md">
            Race now
          </Button>
          <Button href="/signup" variant="secondary" size="md">
            Create account
          </Button>
        </div>
      </section>
    </div>
  );
}