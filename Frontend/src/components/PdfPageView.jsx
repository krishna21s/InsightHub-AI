import React from "react";
import { Document, Page, pdfjs } from "react-pdf";

// ✅ Vite + react-pdf safest worker setup (prevents API/worker mismatch)
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export const PdfPageView = ({ file, pageNumber, onTotalPages }) => {
  return (
    <Document
      file={file}
      onLoadSuccess={(info) => onTotalPages?.(info.numPages)}
      loading={<div className="text-sm text-muted-foreground">Loading PDF...</div>}
      error={<div className="text-sm text-destructive">Failed to load PDF.</div>}
    >
      <Page
        pageNumber={pageNumber}
        renderTextLayer={false}
        renderAnnotationLayer={false}
        loading={<div className="text-sm text-muted-foreground">Loading page...</div>}
      />
    </Document>
  );
};