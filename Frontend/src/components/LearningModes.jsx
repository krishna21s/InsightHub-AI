import React from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, BookOpen, FileQuestion, RotateCcw, Wrench, Eye } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { getOrCreateSessionId } from '@/lib/visionApi';

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
    const { 
        documents, 
        activeMode, 
        setActiveMode, 
        isVisionActive, 
        setVisionActive, 
        setShowDocumentSelector,
        setProcessingMode,
        setModeResults,
        addMessage,
    } = useAppStore();
    
    const hasDocuments = documents.length > 0;
    const hasDiagrams = documents.some(d => d.hasDiagrams);

    const processMode = async (modeId) => {
        try {
            setProcessingMode(true);
            
            // Fresh session per tab (sessionStorage) so refresh starts clean
            const sessionId = getOrCreateSessionId();
            console.log('Processing mode:', modeId, 'with session ID:', sessionId);
            
            if (!sessionId) {
                addMessage({
                    id: `msg-${Date.now()}`,
                    role: 'assistant',
                    content: 'Please upload documents first before selecting a learning mode.',
                    timestamp: new Date(),
                });
                setProcessingMode(false);
                return;
            }

            const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
            
            // Add user message
            addMessage({
                id: `msg-${Date.now()}`,
                role: 'user',
                content: `Process documents in ${modeId} mode`,
                timestamp: new Date(),
            });

            // Call the process-mode API
            const formData = new FormData();
            formData.append('mode', modeId);
            formData.append('session_id', sessionId);
            
            console.log('Calling API:', `${API_BASE}/modes/process-mode`);

            const response = await fetch(`${API_BASE}/modes/process-mode`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error Response:', errorText);
                let errorMsg = response.statusText;
                try {
                    const errorJson = JSON.parse(errorText);
                    errorMsg = errorJson.detail || errorMsg;
                } catch {
                    errorMsg = errorText || errorMsg;
                }
                throw new Error(errorMsg);
            }

            const data = await response.json();
            console.log('Mode processing result:', data);
            setModeResults(data);

            // Add AI response message with the results
            const resultMessage = formatModeResults(data, modeId);
            addMessage({
                id: `msg-${Date.now() + 1}`,
                role: 'assistant',
                content: resultMessage,
                timestamp: new Date(),
                modeResults: data,
            });

        } catch (error) {
            console.error('Error processing mode:', error);
            addMessage({
                id: `msg-${Date.now() + 1}`,
                role: 'assistant',
                content: `Error processing ${modeId} mode: ${error.message}`,
                timestamp: new Date(),
            });
        } finally {
            setProcessingMode(false);
        }
    };

    const formatModeResults = (data, mode) => {
        if (!data.results || data.results.length === 0) {
            return "No results found. Please upload documents first.";
        }

        let message = `**${mode.charAt(0).toUpperCase() + mode.slice(1)} Mode Analysis**\n\n`;
        
        data.results.forEach((result, idx) => {
            message += `**Document ${idx + 1}: ${result.filename}**\n\n`;
            
            if (result.mode_explanation) {
                const explanation = result.mode_explanation;
                message += `${explanation.summary}\n\n`;
                
                if (explanation.learning_points) {
                    message += `**Key Learning Points:**\n`;
                    explanation.learning_points.forEach((point, i) => {
                        message += `${i + 1}. ${point}\n`;
                    });
                    message += '\n';
                }
                
                if (explanation.practice_questions) {
                    message += `**Practice Questions:**\n`;
                    explanation.practice_questions.forEach((q, i) => {
                        message += `${i + 1}. ${q}\n`;
                    });
                    message += '\n';
                }
                
                if (explanation.key_points) {
                    message += `**Quick Points:**\n`;
                    explanation.key_points.forEach((point, i) => {
                        message += `✓ ${point}\n`;
                    });
                    message += '\n';
                }
            }
            
            if (result.vision_analyses && result.vision_analyses.length > 0) {
                message += `\n**📊 Visual Analysis:**\n`;
                result.vision_analyses.forEach((analysis, i) => {
                    message += `\nImage ${i + 1} (Page ${analysis.page_index + 1}):\n${analysis.analysis}\n`;
                });
            }
            
            message += '\n---\n\n';
        });

        return message;
    };

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
            if (!hasDocuments) return;
            
            const isCurrentlyActive = activeMode === mode.id;
            
            if (isCurrentlyActive) {
                // Deactivate mode
                setActiveMode(null);
                setVisionActive(false);
            } else {
                // Activate mode and process documents
                setActiveMode(mode.id);
                setVisionActive(false);
                processMode(mode.id);
            }
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
