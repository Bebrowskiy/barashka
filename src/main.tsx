import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { PlayerProvider } from './context/PlayerContext.tsx';
import { I18nProvider } from './lib/i18n.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <I18nProvider>
        <PlayerProvider>
          <App />
        </PlayerProvider>
      </I18nProvider>
    </ErrorBoundary>
  </StrictMode>,
);
