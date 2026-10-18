import React from 'react';
import style from './DefaultLayout.module.css';

export function DefaultLayout({ children }: React.PropsWithChildren) {
  return <main className={style.main}>{children}</main>;
}
