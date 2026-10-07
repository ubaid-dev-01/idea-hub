import { create } from 'zustand';

export type CreateIdeaMediaFocus =
  | 'none'
  | 'video'
  | 'image'
  | 'document'
  | 'tag';

interface UiState {
  createIdeaOpen: boolean;
  createIdeaMediaFocus: CreateIdeaMediaFocus;
  openCreateIdea: (focus?: CreateIdeaMediaFocus) => void;
  closeCreateIdea: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  /** Admin console drawer (mobile / tablet < md) */
  adminSidebarOpen: boolean;
  setAdminSidebarOpen: (open: boolean) => void;
  toggleAdminSidebar: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  createIdeaOpen: false,
  createIdeaMediaFocus: 'none',
  openCreateIdea: (focus = 'none') =>
    set({ createIdeaOpen: true, createIdeaMediaFocus: focus }),
  closeCreateIdea: () =>
    set({ createIdeaOpen: false, createIdeaMediaFocus: 'none' }),
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () =>
    set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  adminSidebarOpen: false,
  setAdminSidebarOpen: (open) => set({ adminSidebarOpen: open }),
  toggleAdminSidebar: () =>
    set((s) => ({ adminSidebarOpen: !s.adminSidebarOpen })),
}));
