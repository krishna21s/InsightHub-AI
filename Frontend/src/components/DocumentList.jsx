import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, FileImage, File, X, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
const getFileIcon = (type) => {
    switch (type) {
        case 'pdf': return FileText;
        case 'image': return FileImage;
        default: return File;
    }
};
const getTypeColor = (type) => {
    switch (type) {
        case 'pdf': return 'text-red-400';
        case 'ppt': return 'text-orange-400';
        case 'doc': return 'text-blue-400';
        case 'image': return 'text-green-400';
    }
};
export const DocumentList = () => {
    const { documents, activeDocument, setActiveDocument, removeDocument } = useAppStore();
    if (documents.length === 0) {
        return null;
    }
    return (<div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Documents
        </h3>
        <span className="text-xs text-muted-foreground">
          {documents.length}
        </span>
      </div>

      <div className="space-y-1.5">
        <AnimatePresence mode="popLayout">
          {documents.map((doc) => {
            const Icon = getFileIcon(doc.type);
            const isActive = activeDocument?.id === doc.id;
            return (<motion.div key={doc.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20, height: 0 }} layout className={`group relative flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-smooth ${isActive
                    ? 'bg-primary/10 border border-primary/30'
                    : 'bg-secondary/50 hover:bg-secondary border border-transparent'}`} onClick={() => setActiveDocument(isActive ? null : doc)}>
                <div className={`p-1.5 rounded-md bg-secondary ${getTypeColor(doc.type)}`}>
                  <Icon className="w-3.5 h-3.5"/>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-foreground">
                    {doc.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {doc.pageCount} pages · {doc.size}
                  </p>
                </div>

                <motion.button className="absolute right-2 opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-smooth" onClick={(e) => {
                    e.stopPropagation();
                    removeDocument(doc.id);
                }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <X className="w-3.5 h-3.5"/>
                </motion.button>

                {isActive && (<ChevronRight className="w-4 h-4 text-primary"/>)}

                {doc.hasDiagrams && (<div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-glow-vision"/>)}
              </motion.div>);
        })}
        </AnimatePresence>
      </div>
    </div>);
};
