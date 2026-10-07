'use client';

import { useEffect, useState } from 'react';
import { Toaster as HotToaster } from 'react-hot-toast';

export function AppToaster() {
  const [mobile, setMobile] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const apply = () => setMobile(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  return (
    <HotToaster
      position={mobile ? 'bottom-center' : 'bottom-right'}
      containerClassName="!bottom-4"
      toastOptions={{
        duration: 3000,
        className:
          '!bg-[var(--color-surface)] !text-[var(--color-text-primary)] !border !border-[var(--color-border)] !rounded-xl !shadow-dropdown !px-4 !py-3 dark:!border-gray-700 dark:!bg-gray-800',
        success: {
          iconTheme: {
            primary: '#10B981',
            secondary: '#fff',
          },
        },
        error: {
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fff',
          },
        },
      }}
    />
  );
}
