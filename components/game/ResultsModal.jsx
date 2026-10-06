'use client';

import Modal from '../ui/Modal';
import Table from '../ui/Table';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import ItemIcon from './ItemIcon';
import { getItemBySlug } from '../../lib/game/items';

function formatMs(ms) {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms <= 0) return '--:--.---';
  const total = Math.max(0, Math.round(ms));
  const minutes = Math.floor(total / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  const millis = total % 1000;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

function toneForRarity(rarity) {
  if (rarity === 'legendary') return 'legendary';
  if (rarity === 'rare') return 'accent';
  return 'neutral';
}

export default function ResultsModal({
  open,
  result,
  character,
  saved,
  saveError,
  onRestart,
  onClose,
}) {
  const safeResult = result || {};
  const items = Array.isArray(safeResult.items) ? safeResult.items : [];

  const rows = items
    .filter((entry) => entry && entry.slug)
    .map((entry) => {
      const catalogue = getItemBySlug(entry.slug) || {};
      const count = Number(entry.count) || 0;
      const unitPoints =
        typeof catalogue.points === 'number' ? catalogue.points : 0;
      const points =
        typeof entry.points === 'number' ? entry.points : unitPoints * count;
      return {
        slug: entry.slug,
        name: catalogue.name || entry.slug,
        rarity: catalogue.rarity || 'common',
        isHazard: Boolean(catalogue.isHazard),
        count,
        points,
      };
    })
    .sort((a, b) => b.points - a.points);

  const itemPoints = rows.reduce((sum, row) => sum + row.points, 0);
  const score = Number(safeResult.score) || 0;
  const laps = Number(safeResult.laps) || 0;

  const columns = [
    {
      key: 'name',
      header: 'Pickup',
      render: (row) => (
        <span className="results__item">
          <ItemIcon slug={row.slug} size={24} title={row.name} />
          <span className="results__item-name user-text">{row.name}</span>
          <Badge tone={toneForRarity(row.rarity)} size="sm">
            {row.isHazard ? 'Hazard' : row.rarity}
          </Badge>
        </span>
      ),
    },
    {
      key: 'count',
      header: 'Collected',
      align: 'right',
      width: '7rem',
      render: (row) => <span className="num">{row.count}</span>,
    },
    {
      key: 'points',
      header: 'Points',
      align: 'right',
      width: '7rem',
      render: (row) => (
        <span className={row.points < 0 ? 'num num--negative' : 'num'}>
          {row.points > 0 ? `+${row.points}` : row.points}
        </span>
      ),
    },
  ];

  const noticeTone = saveError ? 'danger' : saved ? 'success' : 'warning';
  const noticeText = saveError
    ? `Could not save this run to the leaderboard — ${saveError}`
    : saved
      ? 'Run saved to the global leaderboard. Nice driving.'
      : 'Playing as a guest — sign in to bank these points on the leaderboard.';

  return (
    <Modal
      open={Boolean(open)}
      onClose={onClose}
      title="Chequered flag"
      footer={
        <div className="modal__actions">
          <Button variant="primary" size="md" onClick={onRestart}>
            Race again
          </Button>
          <Button as="a" href="/leaderboard" variant="secondary" size="md">
            View leaderboard
          </Button>
          <Button variant="ghost" size="md" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="results">
        <div className="results__headline">
          <p className="results__label">Final score</p>
          <p className="results__score num">{score}</p>
          <p className="results__driver user-text">
            {character && character.name
              ? `${character.name} around the Monaco Street Circuit`
              : 'Monaco Street Circuit'}
          </p>
        </div>

        <dl className="results__stats">
          <div className="results__stat">
            <dt>Laps</dt>
            <dd className="num">{laps}</dd>
          </div>
          <div className="results__stat">
            <dt>Best lap</dt>
            <dd className="num">{formatMs(safeResult.bestLapMs)}</dd>
          </div>
          <div className="results__stat">
            <dt>Total time</dt>
            <dd className="num">{formatMs(safeResult.totalTimeMs)}</dd>
          </div>
          <div className="results__stat">
            <dt>Pickup points</dt>
            <dd className="num">{itemPoints}</dd>
          </div>
        </dl>

        <p className={`notice notice--${noticeTone}`} role="status">
          {noticeText}
        </p>

        <h3>Crazy cargo</h3>
        <Table
          columns={columns}
          rows={rows}
          rowKey={(row) => row.slug}
          caption="Items collected during this race and the points they scored"
          emptyMessage="No pickups this time — hug the racing line and sweep up the bananas."
        />
      </div>
    </Modal>
  );
}