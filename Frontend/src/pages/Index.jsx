import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, MessageSquare, FileText } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { SidebarContent } from '@/components/SidebarContent';
import { DocumentViewer } from '@/components/DocumentViewer';
import { ChatInterface } from '@/components/ChatInterface';
import { DocumentSelector } from '@/components/DocumentSelector';
import { VisionIndicator } from '@/components/VisionIndicator';
import { VisionViewer } from '@/components/VisionViewer';
import { useAppStore } from '@/store/useAppStore';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

import { useIsMobile } from '@/hooks/use-mobile';

const Index = () => {
  const { activeDocument, isVisionActive } = useAppStore();
  const [mobileView, setMobileView] = useState('chat'); // 'chat' or 'document'
  const isMobile = useIsMobile();

  // Auto-switch to document view on mobile when a document is opened
  useEffect(() => {
    if (activeDocument) {
      setMobileView('document');
    }
  }, [activeDocument]);

  // Vision mode with active document = full screen vision viewer
  const showVisionViewer = isVisionActive && activeDocument;

  // Common wrappers
  const commonWrappers = (
    <>
      <AnimatePresence>
        {isVisionActive && !showVisionViewer && <VisionIndicator />}
      </AnimatePresence>
      <DocumentSelector />
    </>
  );

  if (showVisionViewer) {
    return (
      <div className={`flex min-h-screen w-full bg-background ${isVisionActive ? 'vision-active-border' : ''}`}>
        {commonWrappers}
        <AnimatePresence mode="wait">
          <motion.div key="vision-viewer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 h-screen">
            <VisionViewer />
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // --- MOBILE LAYOUT ---
  if (isMobile) {
    return (
      <div className={`flex flex-col h-dvh w-full bg-background overflow-hidden ${isVisionActive ? 'vision-active-border' : ''}`}>
        {commonWrappers}

        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-sidebar h-16 flex-shrink-0">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="InsightHub-AI" className="w-8 h-8" />
            <span className="font-semibold text-foreground">InsightHub-AI</span>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <button className="p-2 -mr-2 text-muted-foreground hover:text-foreground">
                <Menu className="w-6 h-6" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[280px]">
              <SidebarContent showToggle={false} />
            </SheetContent>
          </Sheet>
        </div>

        {/* Mobile Content */}
        <main className="flex-1 flex flex-col overflow-hidden relative w-full">
          {activeDocument && !isVisionActive && (
            <div className="flex border-b border-border bg-background flex-shrink-0">
              <button
                onClick={() => setMobileView('document')}
                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${mobileView === 'document' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <FileText className="w-4 h-4" />
                Document
              </button>
              <button
                onClick={() => setMobileView('chat')}
                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${mobileView === 'chat' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <MessageSquare className="w-4 h-4" />
                Chat
              </button>
            </div>
          )}

          <AnimatePresence mode="wait">
            {activeDocument && !isVisionActive && mobileView === 'document' && (
              <motion.div className="flex-1 h-full w-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <DocumentViewer />
              </motion.div>
            )}
          </AnimatePresence>

          <div className={`${mobileView === 'chat' || (!activeDocument && !isVisionActive) ? 'flex' : 'hidden'} flex-1 h-full w-full overflow-hidden`}>
            <ChatInterface />
          </div>
        </main>
      </div>
    );
  }

  // --- DESKTOP LAYOUT (Original) ---
  return (
    <div className={`flex min-h-screen w-full bg-background ${isVisionActive ? 'vision-active-border' : ''}`}>
      {commonWrappers}

      <Sidebar />

      <main className="flex-1 flex overflow-hidden">
        <AnimatePresence mode="wait">
          {activeDocument && !isVisionActive && (
            <motion.div
              key="viewer"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '45%', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="h-screen border-r border-border"
            >
              <DocumentViewer />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div className="flex-1 h-screen" layout transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}>
          <ChatInterface />
        </motion.div>
      </main>
    </div>
  );
};
export default Index;
