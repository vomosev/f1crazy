'use client';

import Badge from '../ui/Badge';
import CharacterAvatar from './CharacterAvatar';

function normalise(character) {
  if (!character || typeof character !== 'object') return null;
  const slug = character.slug || character.character_slug;
  if (!slug) return null;
  return {
    slug,
    name: character.name || 'Unnamed driver',
    tagline: character.tagline || '',
    description: character.description || '',
    topSpeed: Number(character.topSpeed ?? character.top_speed ?? 5),
    handling: Number(character.handling ?? 5),
    luck: Number(character.luck ?? 5),
    accentColor: character.accentColor || character.accent_color || 'var(--color-accent)',
    unlockPoints: Number(character.unlockPoints ?? character.unlock_points ?? 0),
    isStarter: Boolean(character.isStarter ?? character.is_starter ?? false),
  };
}

function clampStat(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(10, value));
}

function StatBar({ label, value, accentColor }) {
  const safe = clampStat(value);
  const percent = `${safe * 10}%`;
  return (
    <div className="stat">
      <span className="stat__label">{label}</span>
      <span
        className="stat__track"
        role="img"
        aria-label={`${label}: ${safe} out of 10`}
      >
        <span
          className="stat__fill"
          style={{ width: percent, background: accentColor }}
        />
      </span>
      <span className="stat__value">{safe}</span>
    </div>
  );
}

export default function CharacterPicker({
  characters = [],
  selectedSlug = null,
  onSelect,
  unlockedPoints = 0,
}) {
  const list = (Array.isArray(characters) ? characters : [])
    .map(normalise)
    .filter(Boolean);

  if (list.length === 0) {
    return null;
  }

  const points = Number.isFinite(Number(unlockedPoints)) ? Number(unlockedPoints) : 0;

  return (
    <ul className="character-grid" role="list">
      {list.map((character) => {
        const locked = !character.isStarter && character.unlockPoints > points;
        const isSelected = character.slug === selectedSlug;
        const needed = Math.max(0, character.unlockPoints - points);

        return (
          <li key={character.slug} className="character-grid__item">
            <button
              type="button"
              className={
                'character-card' +
                (isSelected ? ' character-card--selected' : '') +
                (locked ? ' character-card--locked' : '')
              }
              aria-pressed={isSelected}
              disabled={locked}
              onClick={() => {
                if (!locked && typeof onSelect === 'function') {
                  onSelect(character.slug);
                }
              }}
            >
              <span className="character-card__avatar">
                <CharacterAvatar
                  slug={character.slug}
                  accentColor={character.accentColor}
                  size={96}
                />
              </span>

              <span className="character-card__body">
                <span className="character-card__head">
                  <span className="character-card__name">{character.name}</span>
                  {isSelected ? (
                    <Badge tone="success" size="sm">
                      Selected
                    </Badge>
                  ) : null}
                  {locked ? (
                    <Badge tone="warning" size="sm">
                      {needed.toLocaleString('en-GB')} pts to unlock
                    </Badge>
                  ) : null}
                  {!locked && !isSelected && character.isStarter ? (
                    <Badge tone="neutral" size="sm">
                      Starter
                    </Badge>
                  ) : null}
                </span>

                {character.tagline ? (
                  <span className="character-card__tagline user-text">
                    {character.tagline}
                  </span>
                ) : null}

                <span className="character-card__stats">
                  <StatBar
                    label="Top speed"
                    value={character.topSpeed}
                    accentColor={character.accentColor}
                  />
                  <StatBar
                    label="Handling"
                    value={character.handling}
                    accentColor={character.accentColor}
                  />
                  <StatBar
                    label="Luck"
                    value={character.luck}
                    accentColor={character.accentColor}
                  />
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}