'use client';

import Badge from '../ui/Badge';
import ItemIcon from './ItemIcon';

function formatTime(ms) {
  const safe = Number.isFinite(ms) && ms > 0 ? ms : 0;
  const totalSeconds = Math.floor(safe / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const millis = Math.floor(safe % 1000);
  return (
    String(minutes).padStart(2, '0') +
    ':' +
    String(seconds).padStart(2, '0') +
    '.' +
    String(millis).padStart(3, '0')
  );
}

function clampPercent(value) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

export default function HUD({
  lap = 1,
  totalLaps = 3,
  elapsedMs = 0,
  score = 0,
  speed = 0,
  topSpeed = 1,
  bestLapMs = null,
  recentItems = [],
  characterName = '',
  status = 'idle',
}) {
  const speedPercent = clampPercent(
    topSpeed > 0 ? (Number(speed) / Number(topSpeed)) * 100 : 0
  );
  const speedKph = Math.max(0, Math.round(Number(speed) || 0));
  const safeLap = Math.min(Math.max(1, Number(lap) || 1), Math.max(1, totalLaps));
  const chips = Array.isArray(recentItems) ? recentItems.slice(-3).reverse() : [];

  const statusLabel =
    status === 'racing'
      ? 'On track'
      : status === 'countdown'
      ? 'Get ready'
      : status === 'finished'
      ? 'Chequered flag'
      : 'In the pit lane';

  return (
    <section className="hud" aria-label="Race heads-up display">
      <div className="hud__grid">
        <div className="hud__stat">
          <span className="hud__label">Lap</span>
          <span className="hud__value hud__value--num">
            {safeLap}
            <span className="hud__value-sub">/{Math.max(1, totalLaps)}</span>
          </span>
        </div>

        <div className="hud__stat">
          <span className="hud__label">Time</span>
          <span className="hud__value hud__value--num hud__value--time">
            {formatTime(elapsedMs)}
          </span>
        </div>

        <div className="hud__stat">
          <span className="hud__label">Best lap</span>
          <span className="hud__value hud__value--num hud__value--time">
            {bestLapMs ? formatTime(bestLapMs) : '--:--.---'}
          </span>
        </div>

        <div className="hud__stat">
          <span className="hud__label">Score</span>
          <span className="hud__value hud__value--num">
            {Math.max(0, Math.round(Number(score) || 0)).toLocaleString('en-GB')}
          </span>
        </div>

        <div className="hud__stat hud__stat--wide">
          <span className="hud__label">Speed</span>
          <div className="hud__speed">
            <div
              className="hud__speed-track"
              role="meter"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(speedPercent)}
              aria-label="Current speed"
            >
              <span
                className="hud__speed-fill"
                style={{ width: `${speedPercent}%` }}
              />
            </div>
            <span className="hud__value hud__value--num hud__speed-readout">
              {String(speedKph).padStart(3, '0')}
              <span className="hud__value-sub">kph</span>
            </span>
          </div>
        </div>
      </div>

      <div className="hud__footer">
        <div className="hud__meta">
          <Badge tone="neutral" size="sm">
            {statusLabel}
          </Badge>
          {characterName ? (
            <span className="hud__driver user-text">{characterName}</span>
          ) : null}
        </div>

        <div className="hud__pickups" aria-live="polite">
          <span className="hud__label">Last pickups</span>
          <ul className="hud__chips">
            {chips.length === 0 ? (
              <li className="hud__chip-empty">Nothing collected yet</li>
            ) : (
              chips.map((item, index) => (
                <li key={`${item.slug}-${index}`}>
                  <Badge
                    tone={
                      item.isHazard
                        ? 'danger'
                        : item.rarity === 'legendary'
                        ? 'legendary'
                        : item.rarity === 'rare'
                        ? 'accent'
                        : 'success'
                    }
                    size="sm"
                    icon={<ItemIcon slug={item.slug} size={16} title={item.name} />}
                  >
                    {item.name}
                    {typeof item.points === 'number'
                      ? ` ${item.points > 0 ? '+' : ''}${item.points}`
                      : ''}
                  </Badge>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}