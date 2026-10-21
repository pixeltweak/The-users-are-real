/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
// Ignore WebSocket / HMR disconnection errors per runtime environment constraints
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (
      event.reason &&
      (event.reason.message?.includes('WebSocket') ||
        event.reason.message?.includes('vite:ws') ||
        String(event.reason).includes('WebSocket closed'))
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });
  window.addEventListener('error', (event) => {
    if (
      event.message?.includes('WebSocket') ||
      event.filename?.includes('@vite/client')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
