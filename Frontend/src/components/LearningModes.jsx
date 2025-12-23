import React from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, BookOpen, FileQuestion, RotateCcw, Wrench, Eye } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
const modes = [
    {
        id: 'student',
        label: 'Student Mode',
        description: 'Learn concepts step by step',
        icon: 'graduation',
        requiresDocument: true,
    },
    {
        id: 'teacher',
        label: 'Teacher Mode',
        description: 'Generate explanations & slides',
        icon: 'book',
        requiresDocument: true,
    },
    {
        id: 'exam',
        label: 'Exam Mode',
        description: 'Practice with questions',
        icon: 'question',
        requiresDocument: true,
    },
    {
        id: 'revision',
        label: 'Revision Mode',
        description: 'Quick review & summaries',
        icon: 'rotate',
        requiresDocument: true,
    },
    {
        id: 'practical',
        label: 'Practical Mode',
        description: 'Hands-on exercises',
        icon: 'wrench',
        requiresDocument: true,
    },
    {
        id: 'vision',
        label: 'Vision Tutor',
        description: 'Explain diagrams & visuals',
        icon: 'eye',
        requiresDocument: false,
        highlightOnDiagrams: true,
    },
];
const getIcon = (icon) => {
    switch (icon) {
        case 'graduation': return GraduationCap;
        case 'book': return BookOpen;
        case 'question': return FileQuestion;
        case 'rotate': return RotateCcw;
        case 'wrench': return Wrench;
        case 'eye': return Eye;
        default: return BookOpen;
    }
};
export const LearningModes = () => {
    const { documents, activeMode, setActiveMode, isVisionActive, setVisionActive, setShowDocumentSelector } = useAppStore();
    const hasDocuments = documents.length > 0;
    const hasDiagrams = documents.some(d => d.hasDiagrams);
    const handleModeClick = (mode) => {
        if (mode.id === 'vision') {
            if (isVisionActive) {
                setVisionActive(false);
                setActiveMode(null);
            }
            else {
                setVisionActive(true);
                setActiveMode('vision');
                if (hasDocuments) {
                    setShowDocumentSelector(true);
                }
            }
        }
        else {
            if (!hasDocuments)
                return;
            setActiveMode(activeMode === mode.id ? null : mode.id);
            setVisionActive(false);
        }
    };
    return (<div className="space-y-3">
      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Learning Modes
      </h3>

      <div className="space-y-1.5">
        {modes.map((mode) => {
            const Icon = getIcon(mode.icon);
            const isActive = activeMode === mode.id;
            const isDisabled = mode.requiresDocument && !hasDocuments;
            const shouldHighlight = mode.highlightOnDiagrams && hasDiagrams;
            const isVision = mode.id === 'vision';
            return (<motion.button key={mode.id} className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-smooth ${isActive
                    ? isVision
                        ? 'bg-glow-vision/15 border border-glow-vision/40 glow-vision'
                        : 'bg-primary/10 border border-primary/30 mode-active'
                    : isDisabled
                        ? 'opacity-40 cursor-not-allowed bg-secondary/30'
                        : shouldHighlight
                            ? 'bg-glow-vision/5 border border-glow-vision/20 hover:bg-glow-vision/10'
                            : 'bg-secondary/50 hover:bg-secondary border border-transparent'}`} onClick={() => handleModeClick(mode)} disabled={isDisabled && !isVision} whileHover={!isDisabled ? { x: 4 } : {}} whileTap={!isDisabled ? { scale: 0.98 } : {}}>
              <div className={`p-1.5 rounded-md ${isActive
                    ? isVision
                        ? 'bg-glow-vision/20 text-glow-vision'
                        : 'bg-primary/20 text-primary'
                    : shouldHighlight
                        ? 'bg-glow-vision/10 text-glow-vision'
                        : 'bg-secondary text-muted-foreground'}`}>
                <Icon className="w-4 h-4"/>
              </div>

              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${isActive
                    ? isVision ? 'text-glow-vision' : 'text-primary'
                    : 'text-foreground'}`}>
                  {mode.label}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {mode.description}
                </p>
              </div>

              {shouldHighlight && !isActive && (<motion.div className="w-2 h-2 rounded-full bg-glow-vision" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }}/>)}
            </motion.button>);
        })}
      </div>

      {!hasDocuments && (<p className="text-xs text-muted-foreground text-center pt-2">
          Upload documents to unlock modes
        </p>)}
    </div>);
};
