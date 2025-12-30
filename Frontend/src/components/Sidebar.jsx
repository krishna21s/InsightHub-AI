import React from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import { SidebarContent } from './SidebarContent';

export const Sidebar = () => {
  const { isSidebarCollapsed, toggleSidebar, isVisionActive } = useAppStore();

  return (
    <motion.aside
      className={`relative h-screen hidden md:flex flex-col bg-sidebar border-r border-sidebar-border ${isVisionActive ? 'vision-active-border' : ''}`}
      initial={false}
      animate={{
        width: isSidebarCollapsed ? 60 : 280,
      }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
    >
      <SidebarContent
        isCollapsed={isSidebarCollapsed}
        onToggle={toggleSidebar}
      />
    </motion.aside>
  );
};
