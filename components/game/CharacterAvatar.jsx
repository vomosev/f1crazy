import { getCharacterBySlug } from '../../lib/game/characters.js';

const FACES = {
  'banana-baron': (accent) => (
    <g>
      <path
        d="M22 70 C26 36 46 20 76 20 C64 34 60 50 62 70 Z"
        fill={accent}
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <circle cx="40" cy="46" r="5" fill="#101319" />
      <circle cx="56" cy="42" r="5" fill="#101319" />
      <path d="M38 58 Q48 66 58 56" stroke="#101319" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M68 18 L74 8 L82 14" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
    </g>
  ),
  'pineapple-pete': (accent) => (
    <g>
      <path d="M48 16 L40 2 M48 16 L56 2 M48 16 L30 8 M48 16 L66 8" stroke="#3ea66b" strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="48" cy="52" rx="28" ry="34" fill={accent} stroke="currentColor" strokeWidth="3" />
      <path d="M26 40 L70 58 M26 56 L70 38 M26 72 L62 56" stroke="#101319" strokeWidth="2" opacity="0.4" />
      <circle cx="39" cy="48" r="4.5" fill="#101319" />
      <circle cx="58" cy="48" r="4.5" fill="#101319" />
      <path d="M38 64 Q48 72 58 64" stroke="#101319" strokeWidth="3" fill="none" strokeLinecap="round" />
    </g>
  ),
  'turbo-tortoise': (accent) => (
    <g>
      <path d="M14 66 Q48 22 82 66 Z" fill={accent} stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      <path d="M32 64 Q36 42 48 36 Q60 42 64 64" stroke="#101319" strokeWidth="2" fill="none" opacity="0.45" />
      <rect x="12" y="66" width="72" height="12" rx="6" fill="currentColor" opacity="0.25" />
      <circle cx="26" cy="58" r="4" fill="#101319" />
      <circle cx="70" cy="58" r="4" fill="#101319" />
      <path d="M40 76 Q48 82 56 76" stroke="#101319" strokeWidth="3" fill="none" strokeLinecap="round" />
    </g>
  ),
  'disco-dolores': (accent) => (
    <g>
      <circle cx="48" cy="48" r="30" fill={accent} stroke="currentColor" strokeWidth="3" />
      <path d="M18 48 H78 M48 18 V78 M27 27 L69 69 M69 27 L27 69" stroke="#f7f7fb" strokeWidth="2" opacity="0.55" />
      <circle cx="39" cy="42" r="4" fill="#101319" />
      <circle cx="58" cy="42" r="4" fill="#101319" />
      <path d="M38 58 Q48 68 58 58" stroke="#101319" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M48 12 L52 4 L56 12" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
    </g>
  ),
  'sir-honks-a-lot': (accent) => (
    <g>
      <ellipse cx="48" cy="54" rx="28" ry="26" fill={accent} stroke="currentColor" strokeWidth="3" />
      <path d="M68 50 Q86 44 86 54 Q86 64 68 58 Z" fill="#f2a33c" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="42" cy="46" r="5" fill="#101319" />
      <circle cx="58" cy="46" r="4" fill="#101319" />
      <path d="M34 66 Q48 74 62 66" stroke="#101319" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M30 30 Q48 16 66 30" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
    </g>
  ),
  'neon-nina': (accent) => (
    <g>
      <path
        d="M20 56 Q20 22 48 22 Q76 22 76 56 L76 72 Q48 82 20 72 Z"
        fill={accent}
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M26 50 Q48 38 70 50 L70 62 Q48 54 26 62 Z" fill="#101319" opacity="0.85" />
      <path d="M30 54 Q48 46 66 54" stroke="#6ef2d0" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M20 40 H8 M76 40 H88" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </g>
  ),
};

function FallbackFace(accent) {
  return (
    <g>
      <circle cx="48" cy="48" r="30" fill={accent} stroke="currentColor" strokeWidth="3" />
      <circle cx="39" cy="44" r="4.5" fill="#101319" />
      <circle cx="58" cy="44" r="4.5" fill="#101319" />
      <path d="M38 60 Q48 68 58 60" stroke="#101319" strokeWidth="3" fill="none" strokeLinecap="round" />
    </g>
  );
}

export default function CharacterAvatar({ slug, accentColor, size = 96, title }) {
  const character = getCharacterBySlug(slug);
  const accent = accentColor || (character && character.accentColor) || 'currentColor';
  const name = title || (character && character.name) || 'Racing driver';
  const draw = FACES[slug] || FallbackFace;

  return (
    <svg
      className="avatar"
      width={size}
      height={size}
      viewBox="0 0 96 96"
      role="img"
      aria-label={`${name} avatar`}
      style={{ aspectRatio: '1 / 1' }}
      focusable="false"
    >
      <title>{`${name} avatar`}</title>
      <circle cx="48" cy="48" r="46" fill="currentColor" opacity="0.08" />
      <circle cx="48" cy="48" r="45" fill="none" stroke={accent} strokeWidth="2" opacity="0.55" />
      {draw(accent)}
    </svg>
  );
}