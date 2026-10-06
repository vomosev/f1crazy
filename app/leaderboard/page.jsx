'use client';

import { useState } from 'react';
import LeaderboardTable from '../../components/leaderboard/LeaderboardTable';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

const RANGES = [
  { key: 'all', label: 'All time' },
  { key: 'week', label: 'This week' },
];

export default function LeaderboardPage() {
  const [range, setRange] = useState('all');
  const [limit, setLimit] = useState(20);
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <section className="page-section">
      <header className="page-header">
        <h1>Monaco leaderboard</h1>
        <p>
          Every banana, pineapple and flying baguette counts. These are the quickest drivers
          around the Principality&apos;s barriers, ranked by their best single race score and
          split by their fastest lap when the points tie.
        </p>
      </header>

      <div className="toolbar" role="group" aria-label="Leaderboard range">
        {RANGES.map((option) => (
          <Button
            key={option.key}
            variant={range === option.key ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setRange(option.key)}
          >
            {option.label}
          </Button>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setReloadKey((value) => value + 1)}
        >
          Refresh
        </Button>
      </div>

      <Card
        title={range === 'week' ? 'Last seven days' : 'All-time standings'}
        subtitle={`Showing the top ${limit} drivers`}
      >
        <LeaderboardTable
          key={`${range}-${limit}-${reloadKey}`}
          mode="full"
          range={range}
          limit={limit}
        />
      </Card>

      {limit < 100 ? (
        <div className="toolbar">
          <Button
            variant="secondary"
            size="md"
            onClick={() => setLimit((value) => Math.min(100, value + 20))}
          >
            Show more drivers
          </Button>
        </div>
      ) : null}

      <section className="page-section">
        <h2>How scoring works</h2>
        <p>
          Points come from the crazy pickups scattered around the circuit. Bananas are worth 25,
          pineapples 50, rubber ducks 40 and a flying baguette lands you 75. The golden pineapple
          is worth a full 250 — but traffic cones cost you 15, so pick your line carefully through
          the Nouvelle Chicane.
        </p>
        <ul>
          <li>Three laps per race, timed to the millisecond.</li>
          <li>Your best single race counts towards the leaderboard.</li>
          <li>Ties are broken by the fastest lap you set in that race.</li>
        </ul>
      </section>
    </section>
  );
}