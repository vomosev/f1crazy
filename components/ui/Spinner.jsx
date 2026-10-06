'use client';

import React from 'react';

const SIZES = ['sm', 'md', 'lg'];

export default function Spinner({ size = 'md', label = 'Loading', className = '' }) {
  const safeSize = SIZES.includes(size) ? size : 'md';
  const classes = ['spinner', `spinner--${safeSize}`, className].filter(Boolean).join(' ');

  return (
    <span className={classes} role="status" aria-live="polite">
      <svg
        className="spinner__svg"
        viewBox="0 0 32 32"
        width="100%"
        height="100%"
        focusable="false"
        aria-hidden="true"
      >
        <circle className="spinner__track" cx="16" cy="16" r="13" fill="none" strokeWidth="4" />
        <circle
          className="spinner__indicator"
          cx="16"
          cy="16"
          r="13"
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
      <span className="visually-hidden">{label}</span>
    </span>
  );
}