'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSession } from '../../components/SessionProvider';
import RaceCanvas from '../../components/game/RaceCanvas';
import HUD from '../../components/game/HUD';
import ResultsModal from '../../components/game/ResultsModal';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import ItemIcon from '../../components/game/ItemIcon';
import { submitRace, getCharacters } from '../../lib/api';
import {
  CHARACTERS,
  getCharacterBySlug,
  DEFAULT_CHARACTER_SLUG,
} from '../../lib/game/characters';

const CONTROLS = [
  { keys: '↑ / W', action: 'Throttle' },
  { keys: '↓ / S', action: 'Brake and reverse' },
  { keys: '← / A', action: 'Steer left' },
  { keys: '→ / D', action: 'Steer right' },
  { keys: 'Space', action: 'Handbrake slide' },
  { keys: 'Esc', action: 'Pause the race' },
];

function emptyRunState() {
  return {
    status: 'idle',
    score: 0,
    lap: 1,
    laps: 3,
    elapsedMs: 0,
    speed: 0,
    maxSpeed: 1,
    bestLapMs: null,
    collected: [],
  };
}

export default function PlayPage() {
  const { user, status: sessionStatus, selectedCharacter } = useSession();

  const [catalogue, setCatalogue] = useState(CHARACTERS);
  const [catalogueStatus, setCatalogueStatus] = useState('loading');
  const [catalogueError, setCatalogueError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const [run, setRun] = useState(emptyRunState);
  const [raceKey, setRaceKey] = useState(0);
  const [result, setResult] = useState(null);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved | error | guest
  const [saveError, setSaveError] = useState('');

  const countdownRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (countdownRef.current) {
        clearTimeout(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setCatalogueStatus('loading');
    setCatalogueError('');

    getCharacters()
      .then((data) => {
        if (cancelled) return;
        const rows = Array.isArray(data) ? data : data && data.characters;
        if (Array.isArray(rows) && rows.length > 0) {
          setCatalogue(
            rows.map((row) => ({
              slug: row.slug,
              name: row.name,
              tagline: row.tagline,
              description: row.description,
              topSpeed: row.topSpeed ?? row.top_speed ?? 5,
              handling: row.handling ?? 5,
              luck: row.luck ?? 5,
              accentColor: row.accentColor ?? row.accent_color ?? '#e63946',
              unlockPoints: row.unlockPoints ?? row.unlock_points ?? 0,
              isStarter: Boolean(row.isStarter ?? row.is_starter),
            }))
          );
        } else {
          setCatalogue(CHARACTERS);
        }
        setCatalogueStatus('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        setCatalogue(CHARACTERS);
        setCatalogueError(
          err && err.message
            ? `Using offline driver data (${err.message}).`
            : 'Using offline driver data.'
        );
        setCatalogueStatus('ready');
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const character = useMemo(() => {
    const wanted =
      selectedCharacter ||
      (user && user.selectedCharacterSlug) ||
      (user && user.selected_character_slug) ||
      DEFAULT_CHARACTER_SLUG;

    const fromCatalogue = catalogue.find((c) => c.slug === wanted);
    if (fromCatalogue) return fromCatalogue;

    const starter = catalogue.find((c) => c.isStarter) || catalogue[0];
    return starter || getCharacterBySlug(DEFAULT_CHARACTER_SLUG) || CHARACTERS[0];
  }, [catalogue, selectedCharacter, user]);

  const resetRun = useCallback(() => {
    setRun(emptyRunState());
    setResult(null);
    setResultsOpen(false);
    setSaveState('idle');
    setSaveError('');
  }, []);

  const beginCountdown = useCallback(() => {
    if (countdownRef.current) clearTimeout(countdownRef.current);
    resetRun();
    setRaceKey((k) => k + 1);
    setRun((prev) => ({ ...prev, status: 'countdown' }));
    countdownRef.current = setTimeout(() => {
      countdownRef.current = null;
      if (!mountedRef.current) return;
      setRun((prev) => ({ ...prev, status: 'racing' }));
    }, 2600);
  }, [resetRun]);

  const handleTick = useCallback((state) => {
    if (!state) return;
    setRun((prev) => {
      if (prev.status !== 'racing') return prev;
      return {
        ...prev,
        elapsedMs: typeof state.elapsedMs === 'number' ? state.elapsedMs : prev.elapsedMs,
        speed: typeof state.speed === 'number' ? state.speed : prev.speed,
        maxSpeed:
          typeof state.maxSpeed === 'number' && state.maxSpeed > 0
            ? state.maxSpeed
            : prev.maxSpeed,
        lap: typeof state.lap === 'number' ? state.lap : prev.lap,
        laps: typeof state.laps === 'number' ? state.laps : prev.laps,
      };
    });
  }, []);

  const handleScore = useCallback((delta, item) => {
    setRun((prev) => {
      const slug = item && item.slug ? item.slug : 'mystery-crate';
      const name = (item && item.name) || 'Mystery crate';
      const existing = prev.collected.find((entry) => entry.slug === slug);
      const collected = existing
        ? prev.collected.map((entry) =>
            entry.slug === slug
              ? { ...entry, count: entry.count + 1, points: entry.points + delta }
              : entry
          )
        : [...prev.collected, { slug, name, count: 1, points: delta }];

      return {
        ...prev,
        score: Math.max(0, prev.score + delta),
        collected,
      };
    });
  }, []);

  const handleLap = useCallback((lapMs) => {
    setRun((prev) => ({
      ...prev,
      lap: Math.min(prev.lap + 1, prev.laps),
      bestLapMs:
        typeof lapMs === 'number' && lapMs > 0
          ? prev.bestLapMs === null
            ? lapMs
            : Math.min(prev.bestLapMs, lapMs)
          : prev.bestLapMs,
    }));
  }, []);

  const handleFinish = useCallback(
    (raceResult) => {
      setRun((prev) => {
        const finished = {
          score: Math.round(
            (raceResult && raceResult.score) != null ? raceResult.score : prev.score
          ),
          laps: (raceResult && raceResult.laps) || prev.laps,
          bestLapMs: (raceResult && raceResult.bestLapMs) || prev.bestLapMs,
          totalTimeMs: (raceResult && raceResult.totalTimeMs) || prev.elapsedMs,
          items: prev.collected.map((entry) => ({ ...entry })),
        };

        setResult(finished);
        setResultsOpen(true);

        if (!user) {
          setSaveState('guest');
        } else {
          setSaveState('saving');
          setSaveError('');
          submitRace({
            characterSlug: character.slug,
            score: finished.score,
            laps: finished.laps,
            bestLapMs: finished.bestLapMs || 0,
            totalTimeMs: finished.totalTimeMs || 0,
            items: finished.items.map((entry) => ({
              slug: entry.slug,
              count: entry.count,
            })),
          })
            .then(() => {
              if (!mountedRef.current) return;
              setSaveState('saved');
            })
            .catch((err) => {
              if (!mountedRef.current) return;
              setSaveState('error');
              setSaveError(
                (err && err.message) ||
                  'Could not reach the paddock servers. Your run is local only.'
              );
            });
        }

        return { ...prev, status: 'finished' };
      });
    },
    [character, user]
  );

  const handleCloseResults = useCallback(() => {
    setResultsOpen(false);
  }, []);

  const isRacing = run.status === 'racing';
  const isCountdown = run.status === 'countdown';

  if (sessionStatus === 'loading' || catalogueStatus === 'loading') {
    return (
      <section className="page-section">
        <h1>Monaco Street Scramble</h1>
        <p>Warming the tyres and loading your driver…</p>
        <div className="stage stage--skeleton" aria-hidden="true" />
        <p className="muted">
          <Spinner size="sm" label="Loading race" /> Preparing the circuit
        </p>
      </section>
    );
  }

  if (!character) {
    return (
      <section className="page-section">
        <h1>Monaco Street Scramble</h1>
        <EmptyState
          title="No drivers available"
          description="We could not load a single driver for the grid. Check your connection and try again — the offline roster should normally cover this."
          action={
            <Button onClick={() => setReloadKey((k) => k + 1)} variant="primary">
              Retry loading drivers
            </Button>
          }
        />
      </section>
    );
  }

  return (
    <section className="page-section">
      <header className="page-header">
        <h1>Monaco Street Scramble</h1>
        <p>
          Three laps of the principality&apos;s tightest streets. Hoover up bananas,
          pineapples and rubber ducks between Sainte-Dévote and Rascasse, and dodge the
          traffic cones — they cost you points.
        </p>
      </header>

      {catalogueError ? (
        <Card tone="warning" title="Offline roster in use">
          <p className="user-text">{catalogueError}</p>
          <Button size="sm" variant="secondary" onClick={() => setReloadKey((k) => k + 1)}>
            Retry
          </Button>
        </Card>
      ) : null}

      {!user ? (
        <Card tone="accent" title="Racing as a guest">
          <p className="user-text">
            Your lap times and crazy-item haul will not reach the global leaderboard until
            you have an account. Everything else works exactly the same.
          </p>
          <div className="btn-row">
            <Button as="a" href="/signup" size="sm" variant="primary">
              Create account
            </Button>
            <Button as="a" href="/login" size="sm" variant="ghost">
              Sign in
            </Button>
          </div>
        </Card>
      ) : null}

      <HUD
        lap={run.lap}
        laps={run.laps}
        elapsedMs={run.elapsedMs}
        score={run.score}
        speed={run.speed}
        maxSpeed={run.maxSpeed}
        bestLapMs={run.bestLapMs}
        collected={run.collected}
        characterName={character.name}
      />

      <div className="race-stage-wrap">
        <RaceCanvas
          key={raceKey}
          character={character}
          running={isRacing}
          onScore={handleScore}
          onLap={handleLap}
          onFinish={handleFinish}
          onTick={handleTick}
        />

        {run.status === 'idle' ? (
          <div className="stage-overlay">
            <p className="stage-overlay__title">Ready on the grid</p>
            <p className="stage-overlay__text user-text">
              Driving as {character.name} — {character.tagline}
            </p>
            <Button size="lg" variant="primary" onClick={beginCountdown}>
              Start the race
            </Button>
          </div>
        ) : null}

        {isCountdown ? (
          <div className="stage-overlay" role="status" aria-live="polite">
            <p className="stage-overlay__title">Lights out shortly…</p>
            <Spinner size="lg" label="Countdown in progress" />
          </div>
        ) : null}
      </div>

      <div className="btn-row">
        <Button
          variant="primary"
          onClick={beginCountdown}
          disabled={isCountdown}
          loading={isCountdown}
        >
          {run.status === 'idle' ? 'Start race' : 'Restart race'}
        </Button>
        {result ? (
          <Button variant="secondary" onClick={() => setResultsOpen(true)}>
            View last result
          </Button>
        ) : null}
        <Button as="a" href="/garage" variant="ghost">
          Change driver
        </Button>
      </div>

      <Card title="Controls" subtitle="Keyboard on desktop, on-screen pads on touch devices">
        <ul className="controls-legend">
          {CONTROLS.map((control) => (
            <li key={control.keys}>
              <kbd>{control.keys}</kbd>
              <span>{control.action}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Crazy pickups on this circuit">
        <ul className="item-strip">
          {[
            { slug: 'banana', label: 'Banana · 25 pts' },
            { slug: 'pineapple', label: 'Pineapple · 50 pts' },
            { slug: 'rubber-duck', label: 'Rubber duck · 40 pts' },
            { slug: 'flying-baguette', label: 'Flying baguette · 75 pts' },
            { slug: 'golden-pineapple', label: 'Golden pineapple · 250 pts' },
            { slug: 'traffic-cone', label: 'Traffic cone · −15 pts' },
          ].map((item) => (
            <li key={item.slug}>
              <ItemIcon slug={item.slug} size={28} title={item.label} />
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
        <p>
          Need the full rulebook and the standings?{' '}
          <Link href="/leaderboard">See the global leaderboard</Link>.
        </p>
      </Card>

      <ResultsModal
        open={resultsOpen}
        result={result}
        character={character}
        saved={saveState}
        saveError={saveError}
        onRestart={() => {
          setResultsOpen(false);
          beginCountdown();
        }}
        onClose={handleCloseResults}
      />
    </section>
  );
}