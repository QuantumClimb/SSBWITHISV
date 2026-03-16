
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

type RootHolder = { __ssbRoot?: ReactDOM.Root };
const rootHolder = globalThis as typeof globalThis & RootHolder;
const root = rootHolder.__ssbRoot ?? ReactDOM.createRoot(rootElement);
rootHolder.__ssbRoot = root;

root.render(<App />);
