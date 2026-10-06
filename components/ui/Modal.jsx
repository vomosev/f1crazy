'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export default function Modal({
  open = false,
  onClose,
  title,
  footer,
  children,
  labelledById,
}) {
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef(null);
  const previouslyFocusedRef = useRef(null);
  const generatedId = useId();
  const headingId = labelledById || `modal-title-${generatedId}`;

  useEffect(() => {
    setMounted(true);
  }, []);

  const requestClose = useCallback(() => {
    if (typeof onClose === 'function') {
      onClose();
    }
  }, [onClose]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined;

    const { body } = document;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    };
  }, [open]);

  // Focus management: move focus in, trap it, restore on close.
  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined;

    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const node = dialogRef.current;
    if (node) {
      const focusables = node.querySelectorAll(FOCUSABLE_SELECTOR);
      const first = focusables.length > 0 ? focusables[0] : node;
      try {
        first.focus({ preventScroll: true });
      } catch (err) {
        /* focus is best-effort only */
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        requestClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const current = dialogRef.current;
      if (!current) return;

      const focusables = Array.from(current.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );

      if (focusables.length === 0) {
        event.preventDefault();
        current.focus({ preventScroll: true });
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || active === current || !current.contains(active)) {
          event.preventDefault();
          last.focus({ preventScroll: true });
        }
      } else if (active === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      const previous = previouslyFocusedRef.current;
      if (previous && typeof previous.focus === 'function') {
        try {
          previous.focus({ preventScroll: true });
        } catch (err) {
          /* ignore */
        }
      }
    };
  }, [open, requestClose]);

  if (!mounted || !open || typeof document === 'undefined') {
    return null;
  }

  const handleOverlayMouseDown = (event) => {
    if (event.target === event.currentTarget) {
      requestClose();
    }
  };

  return createPortal(
    <div
      className="modal-overlay"
      onMouseDown={handleOverlayMouseDown}
      data-open="true"
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? headingId : undefined}
        aria-label={title ? undefined : 'Dialog'}
        ref={dialogRef}
        tabIndex={-1}
      >
        <div className="modal__header">
          <div className="modal__heading">
            {title ? (
              <h2 className="modal__title" id={headingId}>
                {title}
              </h2>
            ) : null}
          </div>
          <button
            type="button"
            className="modal__close"
            onClick={requestClose}
            aria-label="Close dialog"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M5 5 L15 15 M15 5 L5 15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </button>
        </div>

        <div className="modal__body">{children}</div>

        {footer ? <div className="modal__footer">{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
}