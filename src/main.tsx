import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '@/App';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { SearchProvider } from '@/context/SearchContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { ResearchTrailProvider } from '@/context/ResearchTrailContext';
import { IntelligenceProvider } from '@/context/IntelligenceContext';
import { FederalRegisterProvider } from '@/context/FederalRegisterContext';
import { createQueryClient } from '@/lib/queryClient';
import '@/styles/tailwind.css';
import '@/i18n/config';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root container not found. Failed to mount React app.');
}

const queryClient = createQueryClient();
const enableDevtools = import.meta.env.VITE_QUERY_DEVTOOLS === '1';

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>
        <ResearchTrailProvider>
          <SearchProvider>
            <IntelligenceProvider>
              <FederalRegisterProvider>
                <React.Suspense fallback={null}>
                  <App />
                </React.Suspense>
                {enableDevtools && <ReactQueryDevtools initialIsOpen={false} />}
              </FederalRegisterProvider>
            </IntelligenceProvider>
          </SearchProvider>
        </ResearchTrailProvider>
      </NotificationProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
