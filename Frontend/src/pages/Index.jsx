import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from '@/components/Sidebar';
import { DocumentViewer } from '@/components/DocumentViewer';
import { ChatInterface } from '@/components/ChatInterface';
import { DocumentSelector } from '@/components/DocumentSelector';
import { VisionIndicator } from '@/components/VisionIndicator';
import { VisionViewer } from '@/components/VisionViewer';
import { useAppStore } from '@/store/useAppStore';
const Index = () => {
    const { activeDocument, isVisionActive } = useAppStore();
    // Vision mode with active document = full screen vision viewer
    const showVisionViewer = isVisionActive && activeDocument;
    return (<div className={`flex min-h-screen w-full bg-background ${isVisionActive ? 'vision-active-border' : ''}`}>
      {/* Vision Mode Indicator */}
      <AnimatePresence>
        {isVisionActive && !showVisionViewer && <VisionIndicator />}
      </AnimatePresence>

      {/* Document Selector Modal */}
      <DocumentSelector />

      {/* Full Screen Vision Viewer */}
      <AnimatePresence mode="wait">
        {showVisionViewer ? (<motion.div key="vision-viewer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 h-screen">
            <VisionViewer />
          </motion.div>) : (<>
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content */}
            <main className="flex-1 flex overflow-hidden">
              <AnimatePresence mode="wait">
                {activeDocument && !isVisionActive && (<motion.div key="viewer" initial={{ width: 0, opacity: 0 }} animate={{ width: '45%', opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }} className="h-screen">
                    <DocumentViewer />
                  </motion.div>)}
              </AnimatePresence>

              {/* Chat Interface */}
              <motion.div className="flex-1 h-screen" layout transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}>
                <ChatInterface />
              </motion.div>
            </main>
          </>)}
      </AnimatePresence>
    </div>);
};
export default Index;
