'use client';

import { useId } from 'react';

export default function Field({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  hint,
  required = false,
  autoComplete,
  disabled = false,
  name,
  inputMode,
  maxLength,
  as = 'input',
  rows = 4,
}) {
  const generatedId = useId();
  const fieldId = id || `field-${generatedId}`;
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;

  const describedBy = [hint ? hintId : null, error ? errorId : null]
    .filter(Boolean)
    .join(' ');

  const sharedProps = {
    id: fieldId,
    name: name || fieldId,
    value: value ?? '',
    onChange,
    placeholder,
    required,
    disabled,
    autoComplete,
    'aria-invalid': error ? 'true' : undefined,
    'aria-describedby': describedBy || undefined,
    className: error ? 'input input--error' : 'input',
  };

  return (
    <div className="field">
      <label className="field__label" htmlFor={fieldId}>
        <span className="field__label-text">{label}</span>
        {required ? (
          <span className="field__required" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>

      {as === 'textarea' ? (
        <textarea {...sharedProps} rows={rows} />
      ) : (
        <input {...sharedProps} type={type} inputMode={inputMode} maxLength={maxLength} />
      )}

      {hint ? (
        <p className="field__hint" id={hintId}>
          {hint}
        </p>
      ) : null}

      <p className="field__error" id={errorId} role="alert">
        {error || '\u00a0'}
      </p>
    </div>
  );
}