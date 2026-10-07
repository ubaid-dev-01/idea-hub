'use client';

import { createContext, useContext, type ReactNode } from 'react';

import type { IdeaPostCardContextValue } from './ideaPostCardTypes';

const IdeaPostCardContext = createContext<IdeaPostCardContextValue | null>(
  null
);

export function IdeaPostCardProvider({
  value,
  children,
}: {
  value: IdeaPostCardContextValue;
  children: ReactNode;
}) {
  return (
    <IdeaPostCardContext.Provider value={value}>
      {children}
    </IdeaPostCardContext.Provider>
  );
}

export function useIdeaPostCard(): IdeaPostCardContextValue {
  const ctx = useContext(IdeaPostCardContext);
  if (!ctx) {
    throw new Error('useIdeaPostCard must be used within IdeaPostCardProvider');
  }
  return ctx;
}
