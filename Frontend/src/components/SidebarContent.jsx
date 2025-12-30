import React from 'react';
import { motion } from 'framer-motion';
import { PanelLeftClose, PanelLeft } from 'lucide-react';
import { DocumentUpload } from './DocumentUpload';
import { DocumentList } from './DocumentList';
import { LearningModes } from './LearningModes';
import { ThemeToggle } from './ThemeToggle';

export const SidebarContent = ({ isCollapsed, onToggle, showToggle = true }) => {
    return (
        <div className="flex flex-col h-full bg-sidebar">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
                <motion.div
                    className="flex items-center gap-2.5 overflow-hidden whitespace-nowrap"
                    animate={{
                        opacity: isCollapsed ? 0 : 1,
                        width: isCollapsed ? 0 : "auto"
                    }}
                >
                    <div className="flex-shrink-0 p-2 rounded-lg bg-dark">
                        <img src="/logo3.png" alt="InsightHub-AI" className="w-12 h-13" />
                    </div>
                    <div>
                        <h1 className="text-sm font-semibold text-foreground">InsightHub-AI</h1>
                        <p className="text-xs text-muted-foreground">Knowledge Platform</p>
                    </div>
                </motion.div>

                {showToggle && (
                    <motion.button
                        className="p-2 rounded-lg hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-smooth"
                        onClick={onToggle}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        {isCollapsed ? (<PanelLeft className="w-4 h-4" />) : (<PanelLeftClose className="w-4 h-4" />)}
                    </motion.button>
                )}
            </div>

            {/* Content */}
            <motion.div className="flex-1 overflow-y-auto p-4 space-y-6" animate={{ opacity: isCollapsed ? 0 : 1 }}>
                <DocumentUpload />
                <DocumentList />
                <div className="border-t border-sidebar-border pt-4">
                    <LearningModes />
                </div>
            </motion.div>

            {/* Footer */}
            <motion.div className="p-4 border-t border-sidebar-border flex items-center justify-between" animate={{ opacity: isCollapsed ? 0 : 1 }}>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                    <span>@2025 Logic Lords</span>
                </div>
                <ThemeToggle />
            </motion.div>
        </div>
    );
};
