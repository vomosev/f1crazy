const ICONS = {
  banana: (
    <>
      <path
        d="M6 5c-1 6 2.5 12 11 13.5C14 20.5 9.5 21 6.5 18.5 3 15.5 2.5 9.5 4.5 4.5L6 5z"
        fill="#f6d04a"
        stroke="#8a6a12"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <path d="M17 18.5c1.6.3 3 .1 4-.6-.4 1.4-1.8 2.2-3.6 2l-.4-1.4z" fill="#c8a63a" />
      <path d="M4.5 4.5 3.4 3" stroke="#5c4a0e" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  pineapple: (
    <>
      <path
        d="M12 2.5c.8 1.2 1 2.4.7 3.6.9-.7 2-1 3.1-.8-.6 1-1.5 1.7-2.6 2.1 1.2.1 2.3.6 3.1 1.4-1.4.3-2.7.2-3.9-.3"
        fill="#4caf6d"
      />
      <path
        d="M11.3 5.9c-.7-.6-1.6-1-2.6-1 .4 1 1.1 1.7 2 2.2-1.1 0-2.2.4-3 1.1 1.3.4 2.6.4 3.8.1"
        fill="#3d9459"
      />
      <ellipse cx="12" cy="15" rx="5.2" ry="6.3" fill="#f0b429" stroke="#8a5a12" strokeWidth="1.1" />
      <path
        d="M8.3 11.2 15.7 18.8M15.7 11.2 8.3 18.8M7.2 15h9.6"
        stroke="#8a5a12"
        strokeWidth=".9"
        strokeLinecap="round"
        opacity=".75"
      />
    </>
  ),
  'rubber-duck': (
    <>
      <path
        d="M14.5 5.2c2 0 3.6 1.5 3.6 3.4 0 .6-.2 1.2-.5 1.7 1.7.7 2.9 2.2 2.9 4 0 2.5-2.4 4.5-5.4 4.5H9c-3.2 0-5.8-1.8-5.8-4 0-1.5 1.1-2.8 2.8-3.5 1-2.6 3.1-4.4 5.6-4.4h2.9z"
        fill="#ffd93d"
        stroke="#9a7308"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <circle cx="15.4" cy="8.4" r="1.05" fill="#1c1917" />
      <path d="M18.6 9.6h3.1l-3.1 1.8V9.6z" fill="#f2761a" stroke="#9a4a0c" strokeWidth=".8" />
    </>
  ),
  'traffic-cone': (
    <>
      <path
        d="M12 2.8 18.4 19H5.6L12 2.8z"
        fill="#f2761a"
        stroke="#8c3f08"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <path d="M8.9 10.4h6.2l.9 2.3H8L8.9 10.4z" fill="#f7f3ee" />
      <rect x="3" y="19" width="18" height="2.6" rx="1.1" fill="#4a4a52" stroke="#2b2b31" strokeWidth=".8" />
    </>
  ),
  'flying-baguette': (
    <>
      <path
        d="M4.3 15.1 14.4 5c1.6-1.6 4-1.6 5.3-.2 1.4 1.4 1.3 3.7-.3 5.3L9.3 20.2c-1.5 1.5-3.6 1.5-4.9.2-1.3-1.3-1.4-3.5.1-5z"
        fill="#d8a45c"
        stroke="#8a5b22"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <path
        d="M8.6 14.6l2 2M11.1 12.1l2 2M13.6 9.6l2 2"
        stroke="#8a5b22"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <path d="M2.2 7.4h4.4M1.2 10.6h3.6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity=".6" />
    </>
  ),
  'golden-pineapple': (
    <>
      <path
        d="M12 2.2c.9 1.3 1.1 2.6.8 3.9 1-.8 2.2-1.1 3.4-.9-.7 1.1-1.7 1.9-2.9 2.3 1.3.1 2.5.7 3.4 1.6-1.6.3-3.1.2-4.4-.4"
        fill="#fff3bf"
      />
      <path
        d="M11.2 5.6c-.8-.7-1.8-1.1-2.9-1.1.4 1.1 1.2 1.9 2.2 2.4-1.2 0-2.4.5-3.3 1.2 1.4.5 2.9.5 4.2.1"
        fill="#ffe88a"
      />
      <ellipse cx="12" cy="15" rx="5.4" ry="6.4" fill="#ffd34d" stroke="#a9780a" strokeWidth="1.2" />
      <ellipse cx="12" cy="15" rx="3.4" ry="4.3" fill="#ffe9a0" opacity=".55" />
      <path
        d="M8.2 11.1 15.8 18.9M15.8 11.1 8.2 18.9"
        stroke="#a9780a"
        strokeWidth=".9"
        strokeLinecap="round"
        opacity=".8"
      />
      <path d="M19.4 4.6l.7 1.7 1.7.7-1.7.7-.7 1.7-.7-1.7-1.7-.7 1.7-.7.7-1.7z" fill="#fff6cc" />
    </>
  ),
  'mystery-crate': (
    <>
      <path
        d="M3.4 7.6 12 3.4l8.6 4.2v8.8L12 20.6l-8.6-4.2V7.6z"
        fill="#2f3647"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M3.4 7.6 12 11.8l8.6-4.2" stroke="currentColor" strokeWidth="1.1" fill="none" />
      <path d="M12 11.8v8.8" stroke="currentColor" strokeWidth="1.1" />
      <path
        d="M10.4 8.5c0-.9.8-1.6 1.7-1.6.9 0 1.6.6 1.6 1.4 0 .9-1.2 1.1-1.4 2"
        stroke="#f0b429"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="12.2" cy="12.6" r=".85" fill="#f0b429" />
    </>
  )
};

const FALLBACK = (
  <>
    <circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor" strokeWidth="1.4" />
    <path d="M12 7.6v5.2M12 15.6v.9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </>
);

const LABELS = {
  banana: 'Banana',
  pineapple: 'Pineapple',
  'rubber-duck': 'Rubber duck',
  'traffic-cone': 'Traffic cone',
  'flying-baguette': 'Flying baguette',
  'golden-pineapple': 'Golden pineapple',
  'mystery-crate': 'Mystery crate'
};

export default function ItemIcon({ slug, size = 24, title }) {
  const key = typeof slug === 'string' ? slug : '';
  const art = ICONS[key] || FALLBACK;
  const label = title || LABELS[key] || 'Crazy pickup';
  const dimension = Number.isFinite(Number(size)) && Number(size) > 0 ? Number(size) : 24;

  return (
    <svg
      className="item-icon"
      width={dimension}
      height={dimension}
      viewBox="0 0 24 24"
      role="img"
      aria-label={label}
      focusable="false"
      style={{ aspectRatio: '1', flex: 'none' }}
    >
      <title>{label}</title>
      {art}
    </svg>
  );
}