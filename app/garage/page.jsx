'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import CharacterPicker from '../../components/game/CharacterPicker';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { useSession } from '../../components/SessionProvider';
import { getCharacters, selectCharacter as apiSelectCharacter } from '../../lib/api';
import { CHARACTERS, DEFAULT_CHARACTER_SLUG, getCharacterBySlug } from '../../lib/game/characters';

function normaliseCharacter(row) {
  if (!row || typeof row !== 'object') return null;
  const slug = row.slug || row.character_slug;
  if (!slug) return null;
  const fallback = getCharacterBySlug(slug) || {};
  return {
    slug,
    name: row.name || fallback.name || slug,
    tagline: row.tagline || fallback.tagline || '',
    description: row.description || fallback.description || '',
    topSpeed: Number(row.topSpeed ?? row.top_speed ?? fallback.topSpeed ?? 5),
    handling: Number(row.handling ?? fallback.handling ?? 5),
    luck: Number(row.luck ?? fallback.luck ?? 5),
    accentColor: row.accentColor || row.accent_color || fallback.accentColor || '#e10600',
    unlockPoints: Number(row.unlockPoints ?? row.unlock_points ?? fallback.unlockPoints ?? 0),
    isStarter: Boolean(
      row.isStarter ?? row.is_starter ?? fallback.isStarter ?? false
    ),
  };
}

export default function GaragePage() {
  const session = useSession();
  const user = session?.user || null;
  const status = session?.status || 'guest';
  const selectedCharacter = session?.selectedCharacter || DEFAULT_CHARACTER_SLUG;
  const setSelectedCharacter = session?.setSelectedCharacter;

  const [characters, setCharacters] = useState([]);
  const [loadState, setLoadState] = useState('loading');
  const [usingFallback, setUsingFallback] = useState(false);
  const [saveState, setSaveState] = useState('idle');
  const [saveError, setSaveError] = useState('');

  const load = useCallback(async () => {
    setLoadState('loading');
    setUsingFallback(false);
    try {
      const data = await getCharacters();
      const rows = Array.isArray(data) ? data : data?.characters;
      const list = Array.isArray(rows)
        ? rows.map(normaliseCharacter).filter(Boolean)
        : [];
      if (list.length > 0) {
        setCharacters(list);
        setLoadState('ready');
        return;
      }
      setCharacters(CHARACTERS.map(normaliseCharacter).filter(Boolean));
      setUsingFallback(true);
      setLoadState('ready');
    } catch (err) {
      const local = CHARACTERS.map(normaliseCharacter).filter(Boolean);
      if (local.length > 0) {
        setCharacters(local);
        setUsingFallback(true);
        setLoadState('ready');
      } else {
        setCharacters([]);
        setLoadState('error');
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const unlockedPoints = Number(user?.total_points ?? user?.totalPoints ?? 0);

  const handleSelect = useCallback(
    async (slug) => {
      const chosen = characters.find((c) => c.slug === slug);
      if (!chosen) return;
      if (chosen.unlockPoints > unlockedPoints && !chosen.isStarter) {
        setSaveState('locked');
        setSaveError(
          `${chosen.name} unlocks at ${chosen.unlockPoints.toLocaleString()} career points.`
        );
        return;
      }

      setSaveError('');
      if (typeof setSelectedCharacter === 'function') {
        setSelectedCharacter(slug);
      } else if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem('f1crazy.character', slug);
        } catch (err) {
          /* storage unavailable — selection stays in memory */
        }
      }

      if (status !== 'authenticated') {
        setSaveState('guest');
        return;
      }

      setSaveState('saving');
      try {
        await apiSelectCharacter(slug);
        setSaveState('saved');
        if (typeof session?.refresh === 'function') {
          await session.refresh();
        }
      } catch (err) {
        setSaveState('error');
        setSaveError(
          err?.message || 'We could not save your driver to the paddock right now.'
        );
      }
    },
    [characters, session, setSelectedCharacter, status, unlockedPoints]
  );

  const current = characters.find((c) => c.slug === selectedCharacter) || characters[0] || null;

  return (
    <section className="page-section">
      <header className="page-head">
        <h1>The Garage</h1>
        <p>
          Six very questionable drivers are warming up on the Monaco grid. Pick the one
          whose top speed, handling and luck suit your racing line — luck decides how often
          golden pineapples drop on the Swimming Pool section.
        </p>
      </header>

      {loadState === 'loading' ? (
        <div className="character-grid" aria-busy="true">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton skeleton--card" />
          ))}
          <p className="sr-only">
            <Spinner size="sm" label="Loading drivers" />
          </p>
        </div>
      ) : null}

      {loadState === 'error' ? (
        <Card title="Pit wall radio silence" tone="danger">
          <p>
            We could not reach the F1 Crazy API to load the driver roster. Check your
            connection and try again — you can still race with the default driver.
          </p>
          <div className="button-row">
            <Button variant="primary" onClick={load}>
              Retry
            </Button>
            <Button as="a" href="/play" variant="secondary">
              Race anyway
            </Button>
          </div>
        </Card>
      ) : null}

      {loadState === 'ready' && characters.length === 0 ? (
        <EmptyState
          title="No drivers in the garage"
          description="The roster came back empty. Seed the database with node server/db/seed.js, then reload this page to meet the crew."
          action={
            <Button variant="primary" onClick={load}>
              Reload roster
            </Button>
          }
        />
      ) : null}

      {loadState === 'ready' && characters.length > 0 ? (
        <>
          <div className="garage-status" role="status">
            {current ? (
              <Badge tone="accent">Racing as {current.name}</Badge>
            ) : null}
            {status === 'authenticated' ? (
              <Badge tone="neutral">
                {unlockedPoints.toLocaleString()} career points
              </Badge>
            ) : (
              <Badge tone="warning">Guest mode — choice saved on this device</Badge>
            )}
            {usingFallback ? (
              <Badge tone="warning">Offline roster</Badge>
            ) : null}
            {saveState === 'saving' ? (
              <span className="garage-status__note">
                <Spinner size="sm" label="Saving driver" /> Saving…
              </span>
            ) : null}
            {saveState === 'saved' ? (
              <Badge tone="success">Saved to your profile</Badge>
            ) : null}
          </div>

          {saveError ? (
            <p className="form-error user-text" role="alert">
              {saveError}
            </p>
          ) : null}

          <CharacterPicker
            characters={characters}
            selectedSlug={current ? current.slug : selectedCharacter}
            onSelect={handleSelect}
            unlockedPoints={unlockedPoints}
          />

          <Card title="Ready to roll" subtitle="Three laps of the Monaco street scramble">
            <p>
              Collect bananas, pineapples and the occasional flying baguette. Dodge the
              traffic cones — they cost you points and a chunk of momentum on exit.
            </p>
            <div className="button-row">
              <Button as="a" href="/play" variant="primary" size="lg">
                Start the race
              </Button>
              <Button as="a" href="/leaderboard" variant="secondary" size="lg">
                See the leaderboard
              </Button>
            </div>
            {status !== 'authenticated' ? (
              <p>
                <Link href="/signup">Create a free account</Link> to unlock new drivers and
                save your scores to the global leaderboard.
              </p>
            ) : null}
          </Card>
        </>
      ) : null}
    </section>
  );
}