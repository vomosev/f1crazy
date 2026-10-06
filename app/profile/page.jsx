'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import ItemIcon from '../../components/game/ItemIcon';
import CharacterAvatar from '../../components/game/CharacterAvatar';
import { useSession } from '../../components/SessionProvider';
import { getMyStats, getMyRaces, getMyInventory } from '../../lib/api';
import { CHARACTERS, getCharacterBySlug, DEFAULT_CHARACTER_SLUG } from '../../lib/game/characters';
import { getItemBySlug } from '../../lib/game/items';

function formatMs(ms) {
  if (ms === null || ms === undefined || Number.isNaN(Number(ms))) return '—';
  const total = Number(ms);
  if (total <= 0) return '—';
  const minutes = Math.floor(total / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  const millis = Math.floor(total % 1000);
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatNumber(value) {
  const num = Number(value || 0);
  if (Number.isNaN(num)) return '0';
  return num.toLocaleString();
}

export default function ProfilePage() {
  const { user, status, selectedCharacter } = useSession();

  const [data, setData] = useState({ stats: null, races: [], inventory: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, racesRes, inventoryRes] = await Promise.all([
        getMyStats(),
        getMyRaces({ limit: 10 }),
        getMyInventory(),
      ]);

      setData({
        stats: statsRes?.stats || statsRes || null,
        races: Array.isArray(racesRes?.races) ? racesRes.races : Array.isArray(racesRes) ? racesRes : [],
        inventory: Array.isArray(inventoryRes?.inventory)
          ? inventoryRes.inventory
          : Array.isArray(inventoryRes)
            ? inventoryRes
            : [],
      });
    } catch (err) {
      setError(err?.message || 'We could not load your paddock data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status !== 'authenticated') {
      setLoading(false);
      return;
    }
    load();
  }, [status, load]);

  if (status === 'loading') {
    return (
      <section className="page-section">
        <h1>Driver profile</h1>
        <Card>
          <div className="loading-row">
            <Spinner size="md" label="Checking your session" />
            <p>Checking your paddock pass…</p>
          </div>
        </Card>
      </section>
    );
  }

  if (status !== 'authenticated' || !user) {
    return (
      <section className="page-section">
        <h1>Driver profile</h1>
        <p>
          Sign in to keep your crazy pickups, track your fastest Monaco laps and climb the global
          leaderboard.
        </p>
        <Card>
          <EmptyState
            title="You are racing as a guest"
            description="Guest runs are fun but they vanish when you close the tab. Create a free account to bank your bananas, unlock new drivers and save every lap time around the Monaco street circuit."
            action={
              <div className="button-row">
                <Button href="/login" variant="primary" size="md">
                  Sign in
                </Button>
                <Button href="/signup" variant="secondary" size="md">
                  Create account
                </Button>
              </div>
            }
          />
        </Card>
      </section>
    );
  }

  const characterSlug =
    user.selected_character_slug || selectedCharacter || DEFAULT_CHARACTER_SLUG;
  const character =
    getCharacterBySlug(characterSlug) || CHARACTERS[0] || null;

  const stats = data.stats || {};
  const totalPoints = stats.totalPoints ?? user.total_points ?? 0;
  const racesPlayed = stats.racesPlayed ?? user.races_played ?? 0;
  const bestScore = stats.bestScore ?? 0;
  const bestLapMs = stats.bestLapMs ?? null;

  const raceColumns = [
    {
      key: 'created_at',
      header: 'Date',
      render: (row) => formatDate(row.created_at || row.createdAt),
    },
    {
      key: 'character_slug',
      header: 'Driver',
      render: (row) => {
        const slug = row.character_slug || row.characterSlug;
        const match = getCharacterBySlug(slug);
        return <span className="user-text">{match ? match.name : slug || 'Unknown'}</span>;
      },
    },
    {
      key: 'score',
      header: 'Score',
      align: 'right',
      render: (row) => <span className="num">{formatNumber(row.score)}</span>,
    },
    {
      key: 'items_collected',
      header: 'Pickups',
      align: 'right',
      render: (row) => (
        <span className="num">{formatNumber(row.items_collected ?? row.itemsCollected ?? 0)}</span>
      ),
    },
    {
      key: 'best_lap_ms',
      header: 'Best lap',
      align: 'right',
      render: (row) => <span className="num">{formatMs(row.best_lap_ms ?? row.bestLapMs)}</span>,
    },
    {
      key: 'total_time_ms',
      header: 'Total time',
      align: 'right',
      render: (row) => <span className="num">{formatMs(row.total_time_ms ?? row.totalTimeMs)}</span>,
    },
  ];

  return (
    <section className="page-section">
      <h1>Driver profile</h1>
      <p>
        Everything you have earned around Monaco, {user.username}. Scores are banked the moment you
        cross the line on lap three.
      </p>

      {error ? (
        <Card title="Paddock radio is down" tone="danger">
          <p className="user-text">{error}</p>
          <div className="button-row">
            <Button variant="primary" size="md" onClick={load}>
              Try again
            </Button>
            <Button href="/play" variant="secondary" size="md">
              Go racing anyway
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="stat-grid">
        <Card title="Total points" padded>
          <p className="stat-value num">{loading ? '—' : formatNumber(totalPoints)}</p>
          <p className="stat-caption">Banked across every saved race.</p>
        </Card>
        <Card title="Races finished" padded>
          <p className="stat-value num">{loading ? '—' : formatNumber(racesPlayed)}</p>
          <p className="stat-caption">Three laps of Monaco each.</p>
        </Card>
        <Card title="Best score" padded>
          <p className="stat-value num">{loading ? '—' : formatNumber(bestScore)}</p>
          <p className="stat-caption">Your single strongest run.</p>
        </Card>
        <Card title="Best lap" padded>
          <p className="stat-value num">{loading ? '—' : formatMs(bestLapMs)}</p>
          <p className="stat-caption">Fastest tour of the principality.</p>
        </Card>
      </div>

      <h2>Current driver</h2>
      <Card
        title={character ? character.name : 'No driver selected'}
        subtitle={character ? character.tagline : 'Pick a character in the garage before you race.'}
        actions={
          <Button href="/garage" variant="secondary" size="sm">
            Change driver
          </Button>
        }
      >
        <div className="profile-driver">
          <CharacterAvatar
            slug={character ? character.slug : DEFAULT_CHARACTER_SLUG}
            accentColor={character ? character.accentColor : undefined}
            size={96}
          />
          <div className="profile-driver__body">
            <p className="user-text">
              {character
                ? character.description
                : 'Head to the garage to choose one of the six zany drivers on the F1 Crazy grid.'}
            </p>
            {character ? (
              <div className="badge-row">
                <Badge tone="accent" size="sm">{`Speed ${character.topSpeed}`}</Badge>
                <Badge tone="neutral" size="sm">{`Handling ${character.handling}`}</Badge>
                <Badge tone="success" size="sm">{`Luck ${character.luck}`}</Badge>
              </div>
            ) : null}
          </div>
        </div>
      </Card>

      <h2>Recent races</h2>
      <Card padded={false}>
        <Table
          caption="Your ten most recent races around the Monaco street circuit"
          columns={raceColumns}
          rows={data.races}
          rowKey={(row, index) => row.id ?? `race-${index}`}
          loading={loading}
          emptyMessage="No finished races yet — complete three laps of Monaco to log your first result."
        />
      </Card>

      <h2>Crazy item stash</h2>
      <Card>
        {loading ? (
          <div className="loading-row">
            <Spinner size="sm" label="Loading inventory" />
            <p>Counting bananas…</p>
          </div>
        ) : data.inventory.length === 0 ? (
          <EmptyState
            title="Your stash is empty"
            description="Bananas, pineapples and the occasional flying baguette land in here once you scoop them up on track. Hazards like traffic cones never make the collection."
            action={
              <Button href="/play" variant="primary" size="md">
                Collect some pickups
              </Button>
            }
          />
        ) : (
          <ul className="inventory-list">
            {data.inventory.map((entry, index) => {
              const slug = entry.item_slug || entry.slug || `item-${index}`;
              const meta = getItemBySlug(slug);
              const quantity = Number(entry.quantity ?? entry.count ?? 0);
              return (
                <li key={slug} className="inventory-list__item">
                  <Badge
                    tone={meta && meta.rarity === 'legendary' ? 'legendary' : 'neutral'}
                    size="md"
                    icon={<ItemIcon slug={slug} size={20} title={meta ? meta.name : slug} />}
                  >
                    {`${meta ? meta.name : slug} ×${formatNumber(quantity)}`}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <p className="user-text">
        Want a bigger haul? Try <Link href="/garage">a luckier driver</Link> — luck raises the odds
        of a golden pineapple spawning in the tunnel.
      </p>
    </section>
  );
}