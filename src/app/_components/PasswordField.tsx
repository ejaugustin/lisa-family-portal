'use client';

import { useId, useState } from 'react';

// A caregiver setting up an account under stress shouldn't also have to
// retype a password blind. The toggle button is text, not an icon, so it
// reads correctly without a legend and stays legible without a design
// review — this isn't a component the handoff specifies.

export function PasswordField({
  id,
  name,
  label,
  autoComplete,
  helpText,
}: {
  id?: string;
  name: string;
  label: string;
  autoComplete: 'new-password' | 'current-password';
  helpText?: string;
}) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const [visible, setVisible] = useState(false);

  return (
    <>
      <label htmlFor={fieldId}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          id={fieldId}
          name={name}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          required
          style={{ paddingRight: 76 }}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="secondary"
          aria-label={visible ? 'Hide password' : 'Show password'}
          style={{
            width: 'auto',
            margin: 0,
            position: 'absolute',
            right: 6,
            top: '50%',
            transform: 'translateY(-50%)',
            padding: '6px 12px',
            fontSize: 13,
            border: 'none',
            background: 'transparent',
            color: 'var(--link)',
          }}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
      {helpText && (
        <p className="muted" style={{ marginTop: 8 }}>
          {helpText}
        </p>
      )}
    </>
  );
}
