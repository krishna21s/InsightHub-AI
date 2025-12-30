import React, { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Mic,
  Volume2,
  X,
  Loader2,
} from "lucide-react";
import html2canvas from "html2canvas";
import { useAppStore } from "@/store/useAppStore";
import { askVisionTutor } from "@/lib/visionApi";
import { PdfPageView } from "@/components/PdfPageView";

export const VisionViewer = () => {
  const {
    activeDocument,
    setVisionActive,
    setActiveDocument,
    selectedDocIds,
    setShowDocumentSelector,
  } = useAppStore();

  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [voiceState, setVoiceState] = useState("idle"); // idle | listening | processing | speaking
  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // key to force re-mount (react-pdf recalculates canvas size on mount)
  const [pdfRenderKey, setPdfRenderKey] = useState(0);

  const rootRef = useRef(null); // fullscreen target
  const viewerRef = useRef(null); // screenshot target
  const recognitionRef = useRef(null);
  const utterRef = useRef(null);

  if (!activeDocument) return null;
  console.log("VisionViewer Render:", {
    type: activeDocument.type,
    file: activeDocument.file,
    hasFile: !!activeDocument.file,
    isImage: activeDocument.type === 'image'
  });

  const totalPages = Math.max(1, Number(activeDocument.pageCount || 1));

  const SpeechRecognition = useMemo(
    () => window.SpeechRecognition || window.webkitSpeechRecognition,
    []
  );
  const speechSupported = !!SpeechRecognition;

  const stopRecognition = () => {
    try {
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      }
    } catch { }
    recognitionRef.current = null;
  };

  const stopSpeaking = () => {
    try {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    } catch { }
    utterRef.current = null;
  };

  const takeScreenshotBlob = async () => {
    if (!viewerRef.current) throw new Error("Viewer element not found");

    const canvas = await html2canvas(viewerRef.current, {
      useCORS: true,
      backgroundColor: null,
      scale: 2,
    });

    return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  };

  const startVoiceAndAsk = async () => {
    if (!selectedDocIds || selectedDocIds.length < 1) {
      setShowDocumentSelector(true);
      return;
    }

    if (!speechSupported) {
      alert(
        "Speech recognition not supported in this browser. Please use Chrome."
      );
      return;
    }

    setVoiceState("listening");
    setTranscript("");
    setAiResponse("");

    const recog = new SpeechRecognition();
    recognitionRef.current = recog;

    recog.lang = "en-US";
    recog.interimResults = false;
    recog.maxAlternatives = 1;

    recog.onresult = async (event) => {
      const text = event.results?.[0]?.[0]?.transcript || "";
      setTranscript(text);

      setVoiceState("processing");
      try {
        const blob = await takeScreenshotBlob();
        if (!blob) throw new Error("Failed to create screenshot blob");

        const result = await askVisionTutor({
          query: text,
          imageBlob: blob,
          selectedDocIds,
        });

        const answer = result?.answer || "";
        setAiResponse(answer);
        setVoiceState("speaking");

        try {
          if ("speechSynthesis" in window && answer) {
            stopSpeaking();
            const utter = new SpeechSynthesisUtterance(answer);
            utterRef.current = utter;

            utter.onend = () => {
              utterRef.current = null;
              setVoiceState("idle");
            };
            utter.onerror = () => {
              utterRef.current = null;
              setVoiceState("idle");
            };

            window.speechSynthesis.speak(utter);
          } else {
            setVoiceState("idle");
          }
        } catch {
          setVoiceState("idle");
        }
      } catch (e) {
        console.error(e);
        setAiResponse(`Error: ${e?.message || "Unknown error"}`);
        setVoiceState("idle");
      }
    };

    recog.onerror = (e) => {
      console.error(e);
      setVoiceState("idle");
    };

    recog.onend = () => {
      if (voiceState === "listening") setVoiceState("idle");
    };

    recog.start();
  };

  const handleMicToggle = () => {
    if (voiceState === "listening" || voiceState === "processing") {
      stopRecognition();
      setVoiceState("idle");
      return;
    }
    if (voiceState === "speaking") {
      stopSpeaking();
      setVoiceState("idle");
      return;
    }
    startVoiceAndAsk();
  };

  const handleClose = () => {
    stopRecognition();
    stopSpeaking();

    // exit browser fullscreen if active
    try {
      if (document.fullscreenElement) document.exitFullscreen();
    } catch { }

    // Keep the active document so the main layout (sidebar/chat + document viewer) stays visible.
    setVisionActive(false);
  };

  const toggleFullscreen = async () => {
    try {
      const el = rootRef.current;
      if (!el) return;

      if (!document.fullscreenElement) {
        await el.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }

      // Force react-pdf to remount so it recalculates size for the new viewport
      setTimeout(() => setPdfRenderKey((k) => k + 1), 50);
    } catch (e) {
      console.error("Fullscreen failed:", e);
    }
  };

  const getVoiceButtonStyle = () => {
    switch (voiceState) {
      case "listening":
        return "bg-red-500 glow-vision animate-pulse";
      case "processing":
        return "bg-amber-500";
      case "speaking":
        return "bg-glow-vision glow-vision-strong";
      default:
        return "bg-primary glow-primary-strong";
    }
  };

  const getVoiceIcon = () => {
    switch (voiceState) {
      case "listening":
        return <Mic className="w-8 h-8 animate-pulse" />;
      case "processing":
        return <Loader2 className="w-8 h-8 animate-spin" />;
      case "speaking":
        return <Volume2 className="w-8 h-8" />;
      default:
        return <Mic className="w-8 h-8" />;
    }
  };

  return (
    <motion.div
      ref={rootRef}
      className="flex flex-col h-screen w-full bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      // keep focus/clicks in fullscreen mode
      style={{ outline: "none" }}
      tabIndex={-1}
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between p-4 border-b border-border bg-card gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-glow-vision/10 border border-glow-vision/30">
            <div className="w-2 h-2 rounded-full bg-glow-vision animate-pulse" />
            <span className="text-sm font-medium text-glow-vision">
              Vision Mode
            </span>
          </div>
          <span className="text-foreground font-medium">
            {activeDocument.name}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
            <button
              className="p-2 rounded hover:bg-background text-muted-foreground hover:text-foreground transition-smooth"
              onClick={() => setZoom((z) => Math.max(50, z - 25))}
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <span className="text-sm text-muted-foreground w-14 text-center">
              {zoom}%
            </span>

            <button
              className="p-2 rounded hover:bg-background text-muted-foreground hover:text-foreground transition-smooth"
              onClick={() => setZoom((z) => Math.min(200, z + 25))}
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* ✅ REAL fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-smooth"
            title={isFullscreen ? "Exit full screen" : "Full screen"}
          >
            <Maximize2 className="w-5 h-5" />
          </button>

          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-smooth"
            title="Close Vision"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Document Display (screenshot target) */}
      <div className="flex-1 overflow-auto p-8 flex items-start justify-center">
        <div className="w-full max-w-5xl" style={{ minHeight: 600 }}>
          <div
            ref={viewerRef}
            className="bg-card rounded-2xl shadow-glow border border-border p-6 w-full flex items-center justify-center"
          >
            <div
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: "top center",
              }}
              className="w-full flex justify-center"
            >
              {activeDocument?.type === 'pdf' && activeDocument?.file ? (
                <div className="w-full flex justify-center">
                  <div key={pdfRenderKey}>
                    <PdfPageView
                      file={activeDocument.file}
                      pageNumber={currentPage}
                    />
                  </div>
                </div>
              ) : activeDocument?.type === 'image' && activeDocument?.file ? (
                <div className="w-full flex justify-center">
                  <img
                    src={activeDocument.file}
                    alt="Captured Content"
                    className="max-h-full max-w-full rounded-lg shadow-md object-contain"
                  />
                </div>
              ) : (
                <div className="text-center space-y-6 py-10">
                  <div className="text-8xl text-muted-foreground/30">
                    {activeDocument?.type === 'ppt'
                      ? "📊"
                      : activeDocument?.type === 'doc'
                        ? "📝"
                        : "📄"}
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-foreground mb-2">
                      Page {currentPage}
                    </p>
                    <p className="text-muted-foreground mb-4">
                      Preview is available for PDFs and Images only right now.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Page Navigation */}
      <div className="flex items-center justify-center gap-6 p-4 border-t border-border bg-card">
        <button
          className="p-3 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-40 transition-smooth"
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage <= 1}
          title="Previous page"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <input
            type="number"
            value={currentPage}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (!Number.isNaN(val) && val >= 1 && val <= totalPages)
                setCurrentPage(val);
            }}
            className="w-16 text-center bg-secondary border border-border rounded-lg px-3 py-2 text-foreground"
          />
          <span className="text-muted-foreground">of {totalPages}</span>
        </div>

        <button
          className="p-3 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-40 transition-smooth"
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage >= totalPages}
          title="Next page"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Floating Mic Button */}
      <motion.button
        onClick={handleMicToggle}
        className={`fixed bottom-8 right-8 p-5 rounded-full text-white shadow-2xl transition-all duration-300 ${getVoiceButtonStyle()}`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {getVoiceIcon()}
      </motion.button>

      {/* Voice Feedback Panel */}
      <AnimatePresence>
        {(voiceState !== "idle" || aiResponse) && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-28 right-4 left-4 md:left-auto md:right-8 md:w-96 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-4 border-b border-border bg-secondary/30">
              <div className="flex items-center gap-2">
                {voiceState === "listening" && (
                  <>
                    <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-sm font-medium text-foreground">
                      Listening...
                    </span>
                  </>
                )}
                {voiceState === "processing" && (
                  <>
                    <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                    <span className="text-sm font-medium text-foreground">
                      Processing...
                    </span>
                  </>
                )}
                {voiceState === "speaking" && (
                  <>
                    <Volume2 className="w-4 h-4 text-glow-vision animate-pulse" />
                    <span className="text-sm font-medium text-foreground">
                      Speaking...
                    </span>
                  </>
                )}
                {voiceState === "idle" && aiResponse && (
                  <>
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-sm font-medium text-foreground">
                      Response
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
              {transcript && (
                <div className="bg-primary/10 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    You asked:
                  </p>
                  <p className="text-sm text-foreground">{transcript}</p>
                </div>
              )}
              {aiResponse && (
                <div className="bg-glow-vision/10 rounded-xl p-3 border border-glow-vision/20">
                  <p className="text-xs text-glow-vision mb-1">AI Response:</p>
                  <p className="text-sm text-foreground">{aiResponse}</p>
                </div>
              )}
            </div>

            {voiceState === "idle" && aiResponse && (
              <div className="p-3 border-t border-border">
                <button
                  onClick={() => {
                    setAiResponse("");
                    setTranscript("");
                  }}
                  className="w-full py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-smooth"
                >
                  Dismiss
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};