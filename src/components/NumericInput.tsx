import React, { useRef, useState } from 'react';

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & { type?: 'number' };

export function NumericInput({ value, onChange, onFocus, onBlur, ...props }: Props) {
  const editing = useRef(false);
  const [draft, setDraft] = useState(() => String(value ?? ''));
  return <input {...props} type="number" value={editing.current ? draft : value ?? ''}
    onFocus={event => {
      editing.current = true;
      // Keep zero as a calculation value, while allowing the user to replace it with one keystroke.
      setDraft(event.currentTarget.valueAsNumber === 0 ? '' : event.currentTarget.value);
      onFocus?.(event);
    }}
    onChange={event => {
      setDraft(event.currentTarget.value);
      onChange?.(event);
    }}
    onBlur={event => {
      editing.current = false;
      setDraft(String(value ?? ''));
      onBlur?.(event);
    }} />;
}
