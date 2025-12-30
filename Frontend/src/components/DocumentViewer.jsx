import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { PdfPageView } from './PdfPageView';
export const DocumentViewer = () => {
  const containerRef = React.useRef(null);
  const { activeDocument } = useAppStore();
  const [currentPage, setCurrentPage] = React.useState(1);
  const [zoom, setZoom] = React.useState(100);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  if (!activeDocument)
    return null;
  const totalPages = activeDocument.pageCount;
  return (<motion.div ref={containerRef} className="flex flex-col h-full bg-card border-r border-border" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
    {/* Header */}
    <div className="flex items-center justify-between p-3 border-b border-border bg-secondary/30">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground truncate max-w-[180px]">
          {activeDocument.name}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <button className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-smooth" onClick={() => setZoom(Math.max(50, zoom - 25))}>
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-xs text-muted-foreground w-12 text-center">{zoom}%</span>
        <button className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-smooth" onClick={() => setZoom(Math.min(200, zoom + 25))}>
          <ZoomIn className="w-4 h-4" />
        </button>
        <button className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-smooth ml-1" onClick={toggleFullscreen}>
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </div>

    {/* Document Display */}
    <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
      <div className="bg-background rounded-lg shadow-inner-glow border border-border p-8 min-h-[400px] w-full max-w-2xl flex items-center justify-center" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center' }}>
        {activeDocument.type === 'pdf' && activeDocument.file ? (
          <PdfPageView file={activeDocument.file} pageNumber={currentPage} />
        ) : activeDocument.type === 'image' && activeDocument.file ? (
          <img
            src={activeDocument.file}
            alt={activeDocument.name}
            className="max-h-full max-w-full rounded-lg shadow-md object-contain"
          />
        ) : (
          <div className="text-center space-y-4">
            <div className="text-6xl text-muted-foreground/20">
              {activeDocument.type === 'pdf' ? '📄' : activeDocument.type === 'ppt' ? '📊' : '📝'}
            </div>
            <div>
              <p className="text-lg font-medium text-foreground">Page {currentPage}</p>
              <p className="text-sm text-muted-foreground">Document preview area</p>
            </div>
            {activeDocument.hasDiagrams && (<div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-glow-vision/10 border border-glow-vision/30">
              <div className="w-1.5 h-1.5 rounded-full bg-glow-vision animate-pulse" />
              <span className="text-xs text-glow-vision">Contains diagrams</span>
            </div>)}
          </div>
        )}
      </div>
    </div>

    {/* Page Navigation */}
    <div className="flex items-center justify-center gap-4 p-3 border-t border-border bg-secondary/30">
      <button className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-40 transition-smooth" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-2">
        <input type="number" value={currentPage} onChange={(e) => {
          const val = parseInt(e.target.value);
          if (val >= 1 && val <= totalPages)
            setCurrentPage(val);
        }} className="w-12 text-center bg-secondary border border-border rounded px-2 py-1 text-sm text-foreground" />
        <span className="text-sm text-muted-foreground">of {totalPages}</span>
      </div>

      <button className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-40 transition-smooth" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  </motion.div>);
};
