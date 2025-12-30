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
        const MAX_SIZE_MB = 50;
        const MAX_BYTES = MAX_SIZE_MB * 1024 * 1024;

        const allFiles = Array.from(files);
        const totalSize = allFiles.reduce((acc, file) => acc + file.size, 0);

        if (totalSize > MAX_BYTES) {
          alert(`Total upload size (${(totalSize / 1024 / 1024).toFixed(1)}MB) exceeds the ${MAX_SIZE_MB}MB limit.\nPlease select fewer or smaller files.`);
          return;
        }

        const result = await uploadVisionDocuments(allFiles);
        const fileArr = allFiles;

        // Map backend returned docs to local File objects by filename
        const fileByName = new Map(fileArr.map((f) => [f.name, f]));

        result.documents.forEach((d) => {
          let localFile = fileByName.get(d.filename);

          // fallback: try to match loosely (handles weird paths or duplicates)
          if (!localFile) {
            localFile = fileArr.find((f) => f.name === d.filename) || null;
          }

          // Determine type (map images to 'image' for Viewer compatibility)
          let docType = d.doc_type;
          if (['jpg', 'jpeg', 'png'].includes(docType?.toLowerCase())) {
            docType = 'image';
          } else if (docType === 'pptx') {
            docType = 'ppt';
          }

          addDocument({
            id: d.doc_id, // backend doc id
            name: d.filename,
            type: docType,
            pageCount: d.page_count,
            uploadedAt: new Date(),
            size: localFile
              ? `${(localFile.size / 1024 / 1024).toFixed(1)} MB`
              : "",
            hasDiagrams: true,

            // ✅ required for PDF/Image preview
            // We create a Blob URL so <img> tags can render it directly
            file: localFile ? URL.createObjectURL(localFile) : null,
          });
        });

        // AUTO-SELECT the last uploaded file for immediate viewing
        if (result.documents.length > 0) {
          const lastDocMeta = result.documents[result.documents.length - 1];
          // Find the local doc object we just created in the store? 
          // We just called addDocument multiple times. We need to construct the object to set it active, 
          // OR finding it from the store might be racey if state updates haven't flushed.
          // Better to construct the object exactly as we did above.

          // Let's grab the LAST one from the loop logic
          const d = lastDocMeta;
          let localFile = fileByName.get(d.filename);
          if (!localFile) localFile = fileArr.find((f) => f.name === d.filename) || null;

          let docType = d.doc_type;
          if (['jpg', 'jpeg', 'png'].includes(docType?.toLowerCase())) docType = 'image';
          else if (docType === 'pptx') docType = 'ppt';

          const newDocObj = {
            id: d.doc_id,
            name: d.filename,
            type: docType,
            pageCount: d.page_count,
            uploadedAt: new Date(),
            size: localFile ? `${(localFile.size / 1024 / 1024).toFixed(1)} MB` : "",
            hasDiagrams: true,
            file: localFile ? URL.createObjectURL(localFile) : null,
          };

          // Set as active
          useAppStore.getState().setActiveDocument(newDocObj);
          // Also mark as 'selected' for Vision Tutor context
          useAppStore.getState().toggleSelectedDocId(newDocObj.id);
          // Close the selector so the user sees the viewer immediately
          useAppStore.getState().setShowDocumentSelector(false);
        }

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
        className={`upload-zone flex flex-col items-center justify-center cursor-pointer min-h-[120px] ${isDragOver ? "drag-over border-primary" : ""
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
          accept=".pdf,.ppt,.pptx,.doc,.docx,.jpg,.jpeg,.png"
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
              className={`p-3 rounded-xl mb-3 ${isDragOver
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
              PDF, PPT, DOC, JPG, PNG supported
            </p>
          </motion.div>
        </AnimatePresence>
      </motion.label>
    </div>
  );
};
