
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

type RootHolder = { __vtxRoot?: ReactDOM.Root };
const rootHolder = window as unknown as RootHolder;
const root = rootHolder.__vtxRoot ?? ReactDOM.createRoot(rootElement);
rootHolder.__vtxRoot = root;

root.render(<App />);
