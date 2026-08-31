import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './design-system/tokens.css';
import './index.css';

// Inject custom cursor CSS (Lightning CSS strips cursor: url(), so we inject via JS)
const cursorStyle = document.createElement('style');
cursorStyle.textContent = `
  body { cursor: url('/cursor.png') 0 0, auto !important; }
  a, button, [role="button"], input, select, textarea { cursor: url('/cursor.png') 0 0, pointer !important; }
`;
document.head.appendChild(cursorStyle);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
