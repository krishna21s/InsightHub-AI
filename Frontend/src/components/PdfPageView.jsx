import React from "react";
import { Document, Page, pdfjs } from "react-pdf";

// ✅ Correct Vite + react-pdf worker (prevents API/worker mismatch)
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export const PdfPageView = ({ file, pageNumber, onTotalPages }) => {
  const [containerWidth, setContainerWidth] = React.useState(null);
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    if (!containerRef.current) return;

    // Initialize with current width if available
    const initialWidth = containerRef.current.getBoundingClientRect().width;
    if (initialWidth > 100) {
      setContainerWidth(initialWidth);
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        // use contentRect.width or getBoundingClientRect().width
        const width = entry.contentRect.width;
        // Ignore extremely small widths (often happens during animation/initial mounting)
        if (width > 100) {
          setContainerWidth(width);
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full flex justify-center">
      <Document
        file={file}
        onLoadSuccess={(info) => onTotalPages?.(info.numPages)}
        loading={<div className="text-sm text-muted-foreground">Loading PDF...</div>}
        error={<div className="text-sm text-destructive">Failed to load PDF.</div>}
      >
        <Page
          pageNumber={pageNumber}
          width={containerWidth ? containerWidth : undefined}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          loading={<div className="text-sm text-muted-foreground">Loading page...</div>}
        />
      </Document>
    </div>
  );
};