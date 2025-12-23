import React from 'react';
import { motion } from 'framer-motion';
import { PanelLeftClose, PanelLeft, Sparkles } from 'lucide-react';
import { DocumentUpload } from './DocumentUpload';
import { DocumentList } from './DocumentList';
import { LearningModes } from './LearningModes';
import { useAppStore } from '@/store/useAppStore';
export const Sidebar = () => {
    const { isSidebarCollapsed, toggleSidebar, isVisionActive } = useAppStore();
    return (<motion.aside className={`relative h-screen flex flex-col bg-sidebar border-r border-sidebar-border ${isVisionActive ? 'vision-active-border' : ''}`} initial={false} animate={{
            width: isSidebarCollapsed ? 60 : 280,
        }} transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        <motion.div className="flex items-center gap-2.5" animate={{ opacity: isSidebarCollapsed ? 0 : 1 }}>
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Sparkles className="w-5 h-5 text-primary"/>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground">EduMentor AI</h1>
            <p className="text-xs text-muted-foreground">Knowledge Platform</p>
          </div>
        </motion.div>

        <motion.button className="p-2 rounded-lg hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-smooth" onClick={toggleSidebar} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          {isSidebarCollapsed ? (<PanelLeft className="w-4 h-4"/>) : (<PanelLeftClose className="w-4 h-4"/>)}
        </motion.button>
      </div>

      {/* Content */}
      <motion.div className="flex-1 overflow-y-auto p-4 space-y-6" animate={{ opacity: isSidebarCollapsed ? 0 : 1 }}>
        <DocumentUpload />
        <DocumentList />
        <div className="border-t border-sidebar-border pt-4">
          <LearningModes />
        </div>
      </motion.div>

      {/* Footer */}
      <motion.div className="p-4 border-t border-sidebar-border" animate={{ opacity: isSidebarCollapsed ? 0 : 1 }}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"/>
          <span>AI Ready</span>
        </div>
      </motion.div>
    </motion.aside>);
};
