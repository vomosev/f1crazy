'use client';

import { useCallback, useEffect, useState } from 'react';
import Table from '../ui/Table';
import Badge from '../ui/Badge';
import EmptyState from '../ui/EmptyState';
import Button from '../ui/Button';
import { getLeaderboard } from '../../lib/api';
import { useSession } from '../SessionProvider';
import { getCharacterBySlug } from '../../lib/game/characters';

function formatLap(ms) {
  if (ms === null || ms === undefined || Number.isNaN(Number(ms))) return '—';
  const total = Number(ms);
  if (total <= 0) return '—';
  const minutes = Math.floor(total / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  const millis = Math.floor(total % 1000);
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

function formatScore(value) {
  const n = Number(value) || 0;
  return n.toLocaleString('en-GB');
}

function characterName(slug) {
  if (!slug) return 'Unknown driver';
  const found = getCharacterBySlug(slug);
  if (found && found.name) return found.name;
  return String(slug)
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function LeaderboardTable({ mode = 'full', range = 'all', limit }) {
  const { user } = useSession();
  const effectiveLimit = limit || (mode === 'preview' ? 5 : 20);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getLeaderboard({ range, limit: effectiveLimit });
        if (cancelled) return;
        const list = Array.isArray(data && data.rows) ? data.rows : [];
        setRows(list);
      } catch (err) {
        if (cancelled) return;
        setRows([]);
        setError(
          (err && err.message) ||
            'The timing screens are offline. Please try again in a moment.'
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [range, effectiveLimit, reloadToken]);

  const retry = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  const currentUsername = user && user.username ? user.username : null;

  const columns = [
    {
      key: 'rank',
      header: '#',
      align: 'right',
      width: '3.5rem',
      render: (row) => (
        <span className="leaderboard__rank">{row.rank}</span>
      ),
    },
    {
      key: 'username',
      header: 'Driver',
      render: (row) => {
        const isMe = currentUsername && row.username === currentUsername;
        return (
          <span className="leaderboard__name">
            {row.username}
            {isMe ? (
              <>
                {' '}
                <Badge tone="accent" size="sm">
                  You
                </Badge>
              </>
            ) : null}
          </span>
        );
      },
    },
    {
      key: 'characterSlug',
      header: 'Character',
      render: (row) => (
        <Badge tone="neutral" size="sm">
          {characterName(row.characterSlug)}
        </Badge>
      ),
    },
    {
      key: 'score',
      header: 'Score',
      align: 'right',
      render: (row) => (
        <span className="leaderboard__score num">{formatScore(row.score)}</span>
      ),
    },
  ];

  if (mode !== 'preview') {
    columns.push({
      key: 'bestLapMs',
      header: 'Best lap',
      align: 'right',
      render: (row) => (
        <span className="leaderboard__lap num">{formatLap(row.bestLapMs)}</span>
      ),
    });
    columns.push({
      key: 'races',
      header: 'Races',
      align: 'right',
      width: '5rem',
      render: (row) => <span className="num">{Number(row.races) || 0}</span>,
    });
  }

  if (error && !loading) {
    return (
      <div className="leaderboard leaderboard--error">
        <EmptyState
          tone="danger"
          title="Timing screens unavailable"
          description={error}
          action={
            <Button variant="secondary" size="md" onClick={retry}>
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  if (!loading && rows.length === 0) {
    return (
      <div className="leaderboard leaderboard--empty">
        <EmptyState
          title={
            range === 'week'
              ? 'No laps logged this week'
              : 'The timing sheet is empty'
          }
          description="Nobody has banked a banana around Monaco yet. Take the first green flag and your name goes straight to the top."
          action={
            <Button href="/play" variant="primary" size="md">
              Start a race
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="leaderboard">
      <Table
        columns={columns}
        rows={rows}
        rowKey={(row) => `${row.rank}-${row.username}`}
        caption={
          range === 'week'
            ? 'Top F1 Crazy drivers from the last seven days'
            : 'All-time top F1 Crazy drivers around the Monaco street circuit'
        }
        loading={loading}
        emptyMessage="No results yet."
      />
      {mode === 'preview' && !loading ? (
        <div className="leaderboard__footer">
          <Button href="/leaderboard" variant="ghost" size="sm">
            Full leaderboard
          </Button>
        </div>
      ) : null}
    </div>
  );
}