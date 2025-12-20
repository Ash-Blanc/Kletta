import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { PythonProvider } from 'react-py';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <PythonProvider packages={{ official: ['numpy', 'pandas', 'matplotlib'] }}>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </PythonProvider>
);