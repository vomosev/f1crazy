'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createRaceEngine } from '../../lib/game/engine';
import { TRACK } from '../../lib/game/track';
import { ITEMS } from '../../lib/game/items';

const KEY_MAP = {
  ArrowUp: 'throttle',
  KeyW: 'throttle',
  ArrowDown: 'brake',
  KeyS: 'brake',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
};

export default function RaceCanvas({
  character,
  running = false,
  onScore,
  onLap,
  onFinish,
  onTick,
}) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const engineRef = useRef(null);
  const inputRef = useRef({ throttle: false, brake: false, left: false, right: false });
  const callbacksRef = useRef({ onScore, onLap, onFinish, onTick });
  const [engineError, setEngineError] = useState(null);

  useEffect(() => {
    callbacksRef.current = { onScore, onLap, onFinish, onTick };
  }, [onScore, onLap, onFinish, onTick]);

  const pushInput = useCallback(() => {
    const engine = engineRef.current;
    if (engine && typeof engine.setInput === 'function') {
      try {
        engine.setInput({ ...inputRef.current });
      } catch (err) {
        // Input failures must never break the render loop.
        console.error('F1 Crazy: failed to apply input', err);
      }
    }
  }, []);

  const setInputFlag = useCallback(
    (action, value) => {
      if (!action) return;
      if (inputRef.current[action] === value) return;
      inputRef.current = { ...inputRef.current, [action]: value };
      pushInput();
    },
    [pushInput]
  );

  /* ---- canvas sizing with devicePixelRatio ---- */
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return undefined;

    let frame = 0;
    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height || (rect.width * 9) / 16));
      const pixelWidth = Math.round(width * dpr);
      const pixelHeight = Math.round(height * dpr);
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const engine = engineRef.current;
      if (engine && typeof engine.resize === 'function') {
        try {
          engine.resize(width, height, dpr);
        } catch (err) {
          console.error('F1 Crazy: resize failed', err);
        }
      }
    };

    const scheduleResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(resize);
    };

    resize();

    let observer = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(scheduleResize);
      observer.observe(wrap);
    }
    window.addEventListener('resize', scheduleResize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', scheduleResize);
      if (observer) observer.disconnect();
    };
  }, []);

  /* ---- engine lifecycle ---- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    let engine = null;
    try {
      engine = createRaceEngine({
        canvas,
        character,
        track: TRACK,
        items: ITEMS,
        callbacks: {
          onScore: (delta, item) => {
            const cb = callbacksRef.current.onScore;
            if (typeof cb === 'function') cb(delta, item);
          },
          onLap: (lapMs) => {
            const cb = callbacksRef.current.onLap;
            if (typeof cb === 'function') cb(lapMs);
          },
          onFinish: (result) => {
            const cb = callbacksRef.current.onFinish;
            if (typeof cb === 'function') cb(result);
          },
          onTick: (state) => {
            const cb = callbacksRef.current.onTick;
            if (typeof cb === 'function') cb(state);
          },
        },
      });
      engineRef.current = engine;
      setEngineError(null);
      if (typeof engine.reset === 'function') engine.reset();
      pushInput();
    } catch (err) {
      console.error('F1 Crazy: could not start the race engine', err);
      engineRef.current = null;
      setEngineError('The race engine could not start in this browser.');
      return undefined;
    }

    return () => {
      try {
        if (engine && typeof engine.stop === 'function') engine.stop();
      } catch (err) {
        console.error('F1 Crazy: engine cleanup failed', err);
      }
      engineRef.current = null;
    };
  }, [character, pushInput]);

  /* ---- start / stop driven by the running prop ---- */
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return undefined;
    try {
      if (running) {
        inputRef.current = { throttle: false, brake: false, left: false, right: false };
        if (typeof engine.reset === 'function') engine.reset();
        pushInput();
        if (typeof engine.start === 'function') engine.start();
      } else if (typeof engine.stop === 'function') {
        engine.stop();
      }
    } catch (err) {
      console.error('F1 Crazy: engine state change failed', err);
      setEngineError('The race could not be started. Try reloading the page.');
    }
    return undefined;
  }, [running, pushInput]);

  /* ---- keyboard input ---- */
  useEffect(() => {
    if (!running) return undefined;

    const handleKeyDown = (event) => {
      const action = KEY_MAP[event.code];
      if (!action) return;
      event.preventDefault();
      setInputFlag(action, true);
    };
    const handleKeyUp = (event) => {
      const action = KEY_MAP[event.code];
      if (!action) return;
      event.preventDefault();
      setInputFlag(action, false);
    };
    const handleBlur = () => {
      inputRef.current = { throttle: false, brake: false, left: false, right: false };
      pushInput();
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp, { passive: false });
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      handleBlur();
    };
  }, [running, setInputFlag, pushInput]);

  const touchProps = (action) => ({
    type: 'button',
    className: 'touch-btn',
    'aria-label': TOUCH_LABELS[action],
    onPointerDown: (event) => {
      event.preventDefault();
      if (event.currentTarget.setPointerCapture) {
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch (err) {
          /* pointer capture is best-effort only */
        }
      }
      setInputFlag(action, true);
    },
    onPointerUp: (event) => {
      event.preventDefault();
      setInputFlag(action, false);
    },
    onPointerLeave: () => setInputFlag(action, false),
    onPointerCancel: () => setInputFlag(action, false),
    onContextMenu: (event) => event.preventDefault(),
  });

  return (
    <div className="race-canvas">
      <div className="stage" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          className="stage__canvas"
          role="img"
          aria-label="Monaco street circuit race view"
        />
        {!running && !engineError ? (
          <div className="stage__overlay">
            <p className="stage__overlay-text">
              Press Start to roll out of the pit lane at Sainte-Dévote.
            </p>
          </div>
        ) : null}
        {engineError ? (
          <div className="stage__overlay stage__overlay--error" role="alert">
            <p className="stage__overlay-text">{engineError}</p>
          </div>
        ) : null}
      </div>

      <div className="touch-pad" aria-hidden={false}>
        <div className="touch-pad__group">
          <button {...touchProps('left')}>
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
              <path
                d="M15 4 7 12l8 8"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button {...touchProps('right')}>
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
              <path
                d="M9 4l8 8-8 8"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        <div className="touch-pad__group">
          <button {...touchProps('brake')}>
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
              <rect
                x="5"
                y="5"
                width="14"
                height="14"
                rx="3"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              />
            </svg>
          </button>
          <button {...touchProps('throttle')}>
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
              <path
                d="M12 19V5m0 0-7 7m7-7 7 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

const TOUCH_LABELS = {
  left: 'Steer left',
  right: 'Steer right',
  brake: 'Brake',
  throttle: 'Accelerate',
};