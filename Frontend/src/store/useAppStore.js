import { create } from "zustand";

export const useAppStore = create((set) => ({
  // Documents
  documents: [],
  activeDocument: null,

  // NEW: multi-document selection for Vision Tutor
  selectedDocIds: [],
  setSelectedDocIds: (ids) => set({ selectedDocIds: ids }),
  toggleSelectedDocId: (id) =>
    set((state) => {
      const exists = state.selectedDocIds.includes(id);
      return {
        selectedDocIds: exists
          ? state.selectedDocIds.filter((x) => x !== id)
          : [...state.selectedDocIds, id],
      };
    }),
  clearSelectedDocs: () => set({ selectedDocIds: [] }),

  addDocument: (doc) =>
    set((state) => ({
      documents: [...state.documents, doc],
    })),

  removeDocument: (id) =>
    set((state) => ({
      documents: state.documents.filter((d) => d.id !== id),
      activeDocument:
        state.activeDocument?.id === id ? null : state.activeDocument,
      selectedDocIds: state.selectedDocIds.filter((x) => x !== id),
    })),

  setActiveDocument: (doc) => set({ activeDocument: doc }),

  // Learning Mode
  activeMode: null,
  setActiveMode: (mode) => set({ activeMode: mode }),

  // Mode Processing Results
  modeResults: null,
  setModeResults: (results) => set({ modeResults: results }),
  clearModeResults: () => set({ modeResults: null }),

  // Processing state
  isProcessingMode: false,
  setProcessingMode: (processing) => set({ isProcessingMode: processing }),

  // Vision Mode
  isVisionActive: false,
  setVisionActive: (active) => set({ isVisionActive: active }),

  // Chat
  messages: [],
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),
  clearMessages: () => set({ messages: [] }),

  // UI State
  isSidebarCollapsed: false,
  toggleSidebar: () =>
    set((state) => ({
      isSidebarCollapsed: !state.isSidebarCollapsed,
    })),

  showDocumentSelector: false,
  setShowDocumentSelector: (show) => set({ showDocumentSelector: show }),
}));
