'use client';

import Link from 'next/link';
import Spinner from './Spinner';

function classNames(...parts) {
  return parts.filter(Boolean).join(' ');
}

export default function Button({
  as,
  href,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  type = 'button',
  onClick,
  className,
  children,
  fullWidth = false,
  ...rest
}) {
  const safeVariant = ['primary', 'secondary', 'ghost', 'danger'].includes(variant)
    ? variant
    : 'primary';
  const safeSize = ['sm', 'md', 'lg'].includes(size) ? size : 'md';

  const classes = classNames(
    'btn',
    `btn--${safeVariant}`,
    `btn--${safeSize}`,
    fullWidth && 'btn--block',
    loading && 'is-loading',
    (disabled || loading) && 'is-disabled',
    className
  );

  const content = (
    <>
      {loading ? <Spinner size="sm" label="Working" /> : null}
      <span className="btn__label">{children}</span>
    </>
  );

  const isLink = (as === 'a' || Boolean(href)) && as !== 'button';

  if (isLink) {
    if (disabled || loading || !href) {
      return (
        <span className={classes} aria-disabled="true" role="link" {...rest}>
          {content}
        </span>
      );
    }

    const isExternal = /^https?:\/\//i.test(href) || href.startsWith('mailto:') || href.startsWith('tel:');

    if (isExternal) {
      return (
        <a
          className={classes}
          href={href}
          rel="noopener noreferrer"
          target="_blank"
          onClick={onClick}
          {...rest}
        >
          {content}
        </a>
      );
    }

    return (
      <Link className={classes} href={href} onClick={onClick} {...rest}>
        {content}
      </Link>
    );
  }

  const handleClick = (event) => {
    if (disabled || loading) {
      event.preventDefault();
      return;
    }
    if (typeof onClick === 'function') {
      try {
        onClick(event);
      } catch (error) {
        // Never let a handler error break the render tree.
        // eslint-disable-next-line no-console
        console.error('Button onClick handler failed:', error);
      }
    }
  };

  return (
    <button
      className={classes}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading ? 'true' : undefined}
      onClick={handleClick}
      {...rest}
    >
      {content}
    </button>
  );
}