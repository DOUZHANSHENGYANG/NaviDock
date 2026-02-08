import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { NavProvider } from './context/NavContext';
import { ToastProvider } from './context/ToastContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ToastProvider>
      <NavProvider>
        <App />
      </NavProvider>
    </ToastProvider>
  </React.StrictMode>
);
