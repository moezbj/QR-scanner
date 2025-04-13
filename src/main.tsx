import './index.css'
import React, { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client'

import App from './App'
import './i18n'; // Import the i18n configuration
import { MessageProvider } from './hooks/message';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)

root.render(
  <StrictMode>
    <MessageProvider>
      <App />
    </MessageProvider>
  </StrictMode>
)
