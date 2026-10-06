const TONES = ['neutral', 'accent', 'success', 'warning', 'danger', 'legendary'];
const SIZES = ['sm', 'md'];

export default function Badge({
  tone = 'neutral',
  size = 'md',
  children,
  icon = null,
  title,
  className = '',
}) {
  const safeTone = TONES.includes(tone) ? tone : 'neutral';
  const safeSize = SIZES.includes(size) ? size : 'md';

  const classes = [
    'badge',
    `badge--${safeTone}`,
    `badge--${safeSize}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} title={title}>
      {icon ? (
        <span className="badge__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className="badge__label">{children}</span>
    </span>
  );
}