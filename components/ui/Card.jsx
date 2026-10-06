export default function Card({
  title,
  subtitle,
  actions,
  padded = true,
  tone = 'default',
  children,
  className = '',
  as: Tag = 'section',
}) {
  const classes = [
    'card',
    tone && tone !== 'default' ? `card--${tone}` : '',
    padded ? 'card--padded' : 'card--flush',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const hasHeader = Boolean(title || subtitle || actions);

  return (
    <Tag className={classes}>
      {hasHeader ? (
        <header className="card__header">
          <div className="card__heading">
            {title ? <h3 className="card__title">{title}</h3> : null}
            {subtitle ? <p className="card__subtitle">{subtitle}</p> : null}
          </div>
          {actions ? <div className="card__actions">{actions}</div> : null}
        </header>
      ) : null}
      {children ? <div className="card__body">{children}</div> : null}
    </Tag>
  );
}