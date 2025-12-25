import React from "react";
import { Document, Page, pdfjs } from "react-pdf";

// Use CDN worker (simplest, avoids Vite worker config issues)
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export const PdfPageView = ({ file, pageNumber, onTotalPages }) => {
  return (
    <Document
      file={file}
      onLoadSuccess={(info) => onTotalPages?.(info.numPages)}
      loading={
        <div className="text-sm text-muted-foreground">Loading PDF...</div>
      }
      error={
        <div className="text-sm text-destructive">Failed to load PDF.</div>
      }
    >
      <Page
        pageNumber={pageNumber}
        renderTextLayer={false}
        renderAnnotationLayer={false}
        loading={
          <div className="text-sm text-muted-foreground">Loading page...</div>
        }
      />
    </Document>
  );
};
