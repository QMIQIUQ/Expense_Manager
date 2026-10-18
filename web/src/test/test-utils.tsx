import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LanguageProvider } from '../contexts/LanguageContext';
import * as NotificationContext from '../contexts/NotificationContext';

interface AllTheProvidersProps {
  children: React.ReactNode;
}

function AllTheProviders({ children }: AllTheProvidersProps) {
  const notificationContent = NotificationContext.NotificationProvider ? (
    <NotificationContext.NotificationProvider>{children}</NotificationContext.NotificationProvider>
  ) : children;

  return (
    <BrowserRouter>
      <LanguageProvider>
        {notificationContent}
      </LanguageProvider>
    </BrowserRouter>
  );
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
