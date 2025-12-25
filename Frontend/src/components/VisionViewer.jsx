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
  const viewerRef = useRef(null);

  if (!activeDocument) return null;

  const totalPages = activeDocument.pageCount;

  const SpeechRecognition = useMemo(
    () => window.SpeechRecognition || window.webkitSpeechRecognition,
    []
  );
  const speechSupported = !!SpeechRecognition;

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
    if (selectedDocIds.length < 1) {
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

        setAiResponse(result.answer || "");
        setVoiceState("speaking");

        // (Optional) Use browser TTS to speak response
        try {
          if ("speechSynthesis" in window) {
            const utter = new SpeechSynthesisUtterance(result.answer || "");
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utter);
            utter.onend = () => setVoiceState("idle");
            utter.onerror = () => setVoiceState("idle");
          } else {
            setVoiceState("idle");
          }
        } catch {
          setVoiceState("idle");
        }
      } catch (e) {
        console.error(e);
        setAiResponse(`Error: ${e.message}`);
        setVoiceState("idle");
      }
    };

    recog.onerror = (e) => {
      console.error(e);
      setVoiceState("idle");
    };

    recog.onend = () => {
      // if user cancels before result
      if (voiceState === "listening") setVoiceState("idle");
    };

    recog.start();
  };

  const handleMicToggle = () => {
    if (voiceState === "idle") startVoiceAndAsk();
  };

  const handleClose = () => {
    setVisionActive(false);
    setActiveDocument(null);
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
      className="flex flex-col h-full w-full bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
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
              onClick={() => setZoom(Math.max(50, zoom - 25))}
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-sm text-muted-foreground w-14 text-center">
              {zoom}%
            </span>
            <button
              className="p-2 rounded hover:bg-background text-muted-foreground hover:text-foreground transition-smooth"
              onClick={() => setZoom(Math.min(200, zoom + 25))}
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
          <button className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-smooth">
            <Maximize2 className="w-5 h-5" />
          </button>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-smooth"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Document Display (screenshot target) */}
      <div className="flex-1 overflow-auto p-8 flex items-start justify-center">
        <div
          ref={viewerRef}
          className="bg-card rounded-2xl shadow-glow border border-border p-12 min-h-[600px] w-full max-w-4xl flex items-center justify-center"
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: "top center",
          }}
        >
          <div className="text-center space-y-6">
            <div className="text-8xl text-muted-foreground/30">
              {activeDocument.type === "pdf"
                ? "📄"
                : activeDocument.type === "ppt"
                ? "📊"
                : "📝"}
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground mb-2">
                Page {currentPage}
              </p>
              <p className="text-muted-foreground">
                Scroll through the document to find content with questions
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Page Navigation */}
      <div className="flex items-center justify-center gap-6 p-4 border-t border-border bg-card">
        <button
          className="p-3 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-40 transition-smooth"
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <input
            type="number"
            value={currentPage}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (val >= 1 && val <= totalPages) setCurrentPage(val);
            }}
            className="w-16 text-center bg-secondary border border-border rounded-lg px-3 py-2 text-foreground"
          />
          <span className="text-muted-foreground">of {totalPages}</span>
        </div>

        <button
          className="p-3 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-40 transition-smooth"
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
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
            className="fixed bottom-28 right-8 w-96 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
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
