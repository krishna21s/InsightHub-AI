import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FileText, Eye, Check } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

export const DocumentSelector = () => {
  const {
    showDocumentSelector,
    setShowDocumentSelector,
    documents,
    selectedDocIds,
    toggleSelectedDocId,
  } = useAppStore();

  if (!showDocumentSelector) return null;

  const handleClose = () => setShowDocumentSelector(false);

  const canConfirm = selectedDocIds.length >= 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-glow-vision/20">
                <Eye className="w-5 h-5 text-glow-vision" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Select Documents
                </h3>
                <p className="text-sm text-muted-foreground">
                  Choose one or more documents to analyze
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-smooth"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Document List */}
          <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
            {documents.map((doc) => {
              const selected = selectedDocIds.includes(doc.id);
              return (
                <motion.button
                  key={doc.id}
                  onClick={() => toggleSelectedDocId(doc.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-smooth border
                    ${
                      selected
                        ? "bg-glow-vision/15 border-glow-vision/40"
                        : "bg-secondary/50 border-transparent hover:bg-secondary hover:border-glow-vision/30"
                    }`}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="p-2 rounded-lg bg-secondary">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {doc.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {doc.pageCount} pages
                    </p>
                  </div>
                  {selected && (
                    <div className="p-1.5 rounded-full bg-glow-vision/20 border border-glow-vision/30">
                      <Check className="w-4 h-4 text-glow-vision" />
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border bg-secondary/30 space-y-2">
            <button
              disabled={!canConfirm}
              onClick={handleClose}
              className={`w-full py-2 rounded-lg text-sm transition-smooth ${
                canConfirm
                  ? "bg-glow-vision/20 text-glow-vision border border-glow-vision/30 hover:bg-glow-vision/30"
                  : "bg-secondary text-muted-foreground opacity-60 cursor-not-allowed"
              }`}
            >
              Confirm ({selectedDocIds.length} selected)
            </button>
            <p className="text-xs text-muted-foreground text-center">
              Vision Tutor will analyze visual content in your selected
              documents
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
