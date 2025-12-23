import { create } from 'zustand';
export const useAppStore = create((set) => ({
    // Documents
    documents: [],
    activeDocument: null,
    addDocument: (doc) => set((state) => ({
        documents: [...state.documents, doc]
    })),
    removeDocument: (id) => set((state) => ({
        documents: state.documents.filter(d => d.id !== id),
        activeDocument: state.activeDocument?.id === id ? null : state.activeDocument
    })),
    setActiveDocument: (doc) => set({ activeDocument: doc }),
    // Learning Mode
    activeMode: null,
    setActiveMode: (mode) => set({ activeMode: mode }),
    // Vision Mode
    isVisionActive: false,
    setVisionActive: (active) => set({ isVisionActive: active }),
    // Chat
    messages: [],
    addMessage: (message) => set((state) => ({
        messages: [...state.messages, message]
    })),
    clearMessages: () => set({ messages: [] }),
    // UI State
    isSidebarCollapsed: false,
    toggleSidebar: () => set((state) => ({
        isSidebarCollapsed: !state.isSidebarCollapsed
    })),
    showDocumentSelector: false,
    setShowDocumentSelector: (show) => set({ showDocumentSelector: show }),
}));
