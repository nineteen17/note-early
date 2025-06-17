import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface HelpState {
  isHelpEnabled: boolean;
  toggleHelp: () => void;
  setHelp: (enabled: boolean) => void;
}

export const useHelpStore = create<HelpState>()(
  persist(
    (set) => ({
      isHelpEnabled: false,
      
      toggleHelp: () =>
        set((state) => ({ 
          isHelpEnabled: !state.isHelpEnabled 
        })),
      
      setHelp: (enabled: boolean) =>
        set({ isHelpEnabled: enabled }),
    }),
    {
      name: 'help-storage', // key in localStorage
      partialize: (state) => ({ isHelpEnabled: state.isHelpEnabled }), // only persist the boolean
    }
  )
); 