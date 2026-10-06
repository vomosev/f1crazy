export default function EmptyState({
  title = 'Nothing here yet',
  description,
  action,
  icon,
  tone = 'neutral',
}) {
  return (
    <div className={`empty empty--${tone}`} role="status">
      <div className="empty__art" aria-hidden="true">
        {icon || <DefaultArt />}
      </div>
      <h3 className="empty__title">{title}</h3>
      {description ? <p className="empty__text">{description}</p> : null}
      {action ? <div className="empty__action">{action}</div> : null}
    </div>
  );
}

function DefaultArt() {
  return (
    <svg
      width="72"
      height="72"
      viewBox="0 0 72 72"
      fill="none"
      focusable="false"
      role="presentation"
    >
      <circle
        cx="36"
        cy="36"
        r="27"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeDasharray="7 6"
        opacity="0.55"
      />
      <path
        d="M24 42c4-6 9-9 12-9s8 3 12 9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="28" cy="29" r="2.6" fill="currentColor" />
      <circle cx="44" cy="29" r="2.6" fill="currentColor" />
    </svg>
  );
}