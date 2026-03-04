
import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

const App = lazy(() => import('./App'));

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

type RootHolder = { __ssbRoot?: ReactDOM.Root };
const rootHolder = globalThis as typeof globalThis & RootHolder;
const root = rootHolder.__ssbRoot ?? ReactDOM.createRoot(rootElement);
rootHolder.__ssbRoot = root;

const appRoot = (
  <Suspense fallback={<div className="h-screen w-screen bg-slate-900" />}>
    <App />
  </Suspense>
);

root.render(
  import.meta.env.DEV ? appRoot : <React.StrictMode>{appRoot}</React.StrictMode>
);
