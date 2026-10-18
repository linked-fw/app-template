import React from 'react';
import { DefaultLayout } from '../layout/DefaultLayout';
import style from './Home.module.css';

// APP_NAME comes from `.env` (copied from `.env.example` on install); a host
// such as Create Now writes the project's name there.
export default function Home() {
  return (
    <DefaultLayout>
      <h1 className={style.Home} data-testid="app-name">
        {process.env.APP_NAME}
      </h1>
    </DefaultLayout>
  );
}
