import React, { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { uploadVisionDocuments } from "@/lib/visionApi";

export const DocumentUpload = () => {
  const [isDragOver, setIsDragOver] = useState(false);
  const { addDocument } = useAppStore();

  const handleFiles = useCallback(
    async (files) => {
      try {
        const result = await uploadVisionDocuments(files);

        // Backend returns: { session_id, documents: [{doc_id, filename, doc_type, page_count}] }
        result.documents.forEach((d) => {
          addDocument({
            id: d.doc_id, // IMPORTANT: backend doc id
            name: d.filename,
            type: d.doc_type === "pptx" ? "ppt" : d.doc_type, // keep UI types consistent
            pageCount: d.page_count,
            uploadedAt: new Date(),
            size: "", // optional: you can compute from local File if needed
            hasDiagrams: true, // optional heuristic; keep UI highlight
          });
        });
      } catch (e) {
        console.error(e);
        alert(`Upload failed: ${e.message}`);
      }
    },
    [addDocument]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e) => {
      if (e.target.files) handleFiles(e.target.files);
    },
    [handleFiles]
  );

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Upload Knowledge
      </h3>

      <motion.label
        className={`upload-zone flex flex-col items-center justify-center cursor-pointer min-h-[120px] ${
          isDragOver ? "drag-over border-primary" : ""
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <input
          type="file"
          className="hidden"
          multiple
          accept=".pdf,.ppt,.pptx,.doc,.docx"
          onChange={handleInputChange}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={isDragOver ? "drop" : "default"}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col items-center text-center"
          >
            <motion.div
              className={`p-3 rounded-xl mb-3 ${
                isDragOver
                  ? "bg-primary/20 text-primary"
                  : "bg-secondary text-muted-foreground"
              }`}
              animate={isDragOver ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              <Upload className="w-5 h-5" />
            </motion.div>

            <p className="text-sm text-foreground font-medium">
              {isDragOver ? "Drop files here" : "Drop files or click"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, PPT, DOC supported
            </p>
          </motion.div>
        </AnimatePresence>
      </motion.label>
    </div>
  );
};
