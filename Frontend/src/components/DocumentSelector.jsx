import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Eye } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
export const DocumentSelector = () => {
    const { showDocumentSelector, setShowDocumentSelector, documents, setActiveDocument } = useAppStore();
    if (!showDocumentSelector)
        return null;
    const handleSelect = (docId) => {
        const doc = documents.find(d => d.id === docId);
        if (doc) {
            setActiveDocument(doc);
            setShowDocumentSelector(false);
        }
    };
    return (<AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={() => setShowDocumentSelector(false)}>
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-glow-vision/20">
                <Eye className="w-5 h-5 text-glow-vision"/>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Select Document</h3>
                <p className="text-sm text-muted-foreground">Choose a document to analyze</p>
              </div>
            </div>
            <button onClick={() => setShowDocumentSelector(false)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-smooth">
              <X className="w-5 h-5"/>
            </button>
          </div>

          {/* Document List */}
          <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
            {documents.map((doc) => (<motion.button key={doc.id} onClick={() => handleSelect(doc.id)} className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary border border-transparent hover:border-glow-vision/30 text-left transition-smooth" whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }}>
                <div className="p-2 rounded-lg bg-secondary">
                  <FileText className="w-5 h-5 text-muted-foreground"/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.pageCount} pages · {doc.size}
                  </p>
                </div>
                {doc.hasDiagrams && (<div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-glow-vision/10 border border-glow-vision/30">
                    <div className="w-1.5 h-1.5 rounded-full bg-glow-vision"/>
                    <span className="text-xs text-glow-vision">Diagrams</span>
                  </div>)}
              </motion.button>))}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border bg-secondary/30">
            <p className="text-xs text-muted-foreground text-center">
              Vision Tutor will analyze visual content in your selected document
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>);
};
