import React from 'react';
import type { FallbackProps } from 'react-error-boundary';
import style from './Error.module.css';

export function Error({ error }: FallbackProps) {
  return (
    <div className={style.error}>
      <h1>Application Error</h1>
      <pre>{error.stack}</pre>
    </div>
  );
}
