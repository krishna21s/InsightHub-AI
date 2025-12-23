import React from 'react';
import { motion } from 'framer-motion';
import { Eye } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
export const VisionIndicator = () => {
    const { isVisionActive } = useAppStore();
    if (!isVisionActive)
        return null;
    return (<motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-4 left-1/2 -translate-x-1/2 z-40">
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-glow-vision/20 border border-glow-vision/40 backdrop-blur-sm glow-vision">
        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }}>
          <Eye className="w-4 h-4 text-glow-vision"/>
        </motion.div>
        <span className="text-sm font-medium text-glow-vision">Vision Active</span>
      </div>
    </motion.div>);
};
