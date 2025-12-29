import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, RefreshCw, Lightbulb, FileText, HelpCircle, Eye, Camera, Upload, Loader2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { getOrCreateSessionId } from '@/lib/visionApi';
import ReactMarkdown from 'react-markdown';

const quickActions = [
    { icon: RefreshCw, label: 'Explain again', action: 'explain' },
    { icon: Lightbulb, label: 'Give example', action: 'example' },
    { icon: FileText, label: 'Generate notes', action: 'notes' },
    { icon: HelpCircle, label: 'Create quiz', action: 'quiz' },
];

export const ChatInterface = () => {
    const { 
        messages, 
        addMessage, 
        activeDocument, 
        activeMode, 
        isVisionActive, 
        documents, 
        setShowDocumentSelector,
        isProcessingMode,
        modeResults,
    } = useAppStore();
    
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = () => {
        if (!input.trim()) return;

        const userMessage = {
            id: `msg-${Date.now()}`,
            role: 'user',
            content: input,
            timestamp: new Date(),
        };

        addMessage(userMessage);
        setInput('');
        setIsTyping(true);

        answerWithBackend(input);
    };

    const answerWithBackend = async (query) => {
        const sessionId = getOrCreateSessionId();
        const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        const docId = activeDocument?.id || null;

        try {
            const formData = new FormData();
            formData.append('session_id', sessionId);
            formData.append('question', query);
            if (docId) formData.append('doc_id', docId);
            if (activeMode) formData.append('mode', activeMode);

            const res = await fetch(`${API_BASE}/modes/ask`, {
                method: 'POST',
                body: formData,
            });

            let content = '';
            if (!res.ok) {
                const errText = await res.text();
                content = `Could not answer: ${errText || res.statusText}`;
            } else {
                const data = await res.json();
                if (Array.isArray(data.answer)) {
                    content = data.answer
                        .map((a, idx) => {
                            const bullets = (a.bullets || []).join('\n');
                            return `**Match ${idx + 1} · ${a.filename} · Page ${a.page_index + 1}**\n${bullets}`;
                        })
                        .join('\n\n');
                } else {
                    content = data.answer || 'No matching passage found.';
                }
            }

            const aiMessage = {
                id: `msg-${Date.now()}`,
                role: 'assistant',
                content,
                timestamp: new Date(),
            };
            addMessage(aiMessage);
        } catch (err) {
            addMessage({
                id: `msg-${Date.now()}`,
                role: 'assistant',
                content: `Error answering: ${err.message}`,
                timestamp: new Date(),
            });
        } finally {
            setIsTyping(false);
        }
    };

    const handleQuickAction = (action) => {
        const actionPrompts = {
            explain: 'Can you explain that concept again in simpler terms?',
            example: 'Can you give me a practical example of this?',
            notes: 'Generate concise study notes from this content.',
            quiz: 'Create a short quiz to test my understanding.',
        };

        setInput(actionPrompts[action] || '');
    };

    const hasDocuments = documents.length > 0;
    const showVisionPrompt = isVisionActive && !hasDocuments;

    return (
        <div className="flex flex-col h-full">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.length === 0 ? (
                    <WelcomeMessage
                        isVisionActive={isVisionActive}
                        hasDocuments={hasDocuments}
                        onSelectDocument={() => setShowDocumentSelector(true)}
                    />
                ) : (
                    <AnimatePresence>
                        {messages.map((message) => (
                            <MessageBubble key={message.id} message={message} onQuickAction={handleQuickAction} />
                        ))}
                    </AnimatePresence>
                )}

                {(isTyping || isProcessingMode) && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 text-muted-foreground"
                    >
                        <div className="flex gap-1">
                            {[0, 1, 2].map((i) => (
                                <motion.div
                                    key={i}
                                    className="w-2 h-2 rounded-full bg-primary/50"
                                    animate={{ y: [0, -6, 0] }}
                                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                                />
                            ))}
                        </div>
                        <span className="text-sm">
                            {isProcessingMode ? 'Processing documents...' : 'AI is thinking...'}
                        </span>
                    </motion.div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Vision Mode Prompt */}
            {showVisionPrompt && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mx-6 mb-4 p-4 rounded-xl bg-glow-vision/10 border border-glow-vision/30"
                >
                    <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-glow-vision/20">
                            <Eye className="w-5 h-5 text-glow-vision" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-foreground mb-2">Vision Tutor Active</p>
                            <p className="text-sm text-muted-foreground mb-3">
                                No documents uploaded. Choose how to provide visual content:
                            </p>
                            <div className="flex gap-2">
                                <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-glow-vision/20 text-glow-vision text-sm hover:bg-glow-vision/30 transition-smooth">
                                    <Upload className="w-4 h-4" />
                                    Upload Document
                                </button>
                                <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-foreground text-sm hover:bg-secondary/80 transition-smooth">
                                    <Camera className="w-4 h-4" />
                                    Capture Screen
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Input Area */}
            <div className="p-4 border-t border-border bg-card/50">
                <div className="flex items-end gap-3">
                    <div className="flex-1 relative">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder={
                                isVisionActive
                                    ? 'Ask about diagrams, graphs, or visuals...'
                                    : activeDocument
                                    ? `Ask about ${activeDocument.name}...`
                                    : 'Ask a question...'
                            }
                            className="w-full resize-none bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-smooth"
                            rows={1}
                        />
                    </div>
                    <motion.button
                        onClick={handleSend}
                        disabled={!input.trim() || isProcessingMode}
                        className="p-3 rounded-xl bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed glow-primary-strong hover:shadow-glow-lg transition-smooth"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        {isProcessingMode ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
                    </motion.button>
                </div>
            </div>
        </div>
    );
};
const WelcomeMessage = ({ isVisionActive, hasDocuments, onSelectDocument }) => {
    return (<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center h-full text-center px-8">
      <motion.div className={`p-4 rounded-2xl mb-6 ${isVisionActive
            ? 'bg-glow-vision/10 glow-vision'
            : 'bg-primary/10 glow-primary'}`} animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
        {isVisionActive ? (<Eye className="w-10 h-10 text-glow-vision"/>) : (<Lightbulb className="w-10 h-10 text-primary"/>)}
      </motion.div>

      <h2 className="text-2xl font-semibold text-foreground mb-3">
        {isVisionActive ? 'Vision Tutor Mode' : 'Welcome to EduMentor AI'}
      </h2>
      
      <p className="text-muted-foreground max-w-md mb-6">
        {isVisionActive
            ? 'I can analyze and explain diagrams, graphs, code blocks, and visual content from your documents.'
            : 'Upload your learning materials to get started. I adapt to your documents and help you learn effectively.'}
      </p>

      {isVisionActive && hasDocuments && (<motion.button onClick={onSelectDocument} className="px-6 py-3 rounded-xl bg-glow-vision/20 text-glow-vision border border-glow-vision/30 hover:bg-glow-vision/30 transition-smooth" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          Select Document to Analyze
        </motion.button>)}

      <div className="grid grid-cols-2 gap-3 mt-8 w-full max-w-sm">
        {[
            { icon: '📄', text: 'Upload documents' },
            { icon: '🎯', text: 'Choose learning mode' },
            { icon: '💬', text: 'Ask questions' },
            { icon: '📊', text: 'Analyze visuals' },
        ].map((item, i) => (<motion.div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50 text-sm text-muted-foreground" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}>
            <span>{item.icon}</span>
            <span>{item.text}</span>
          </motion.div>))}
      </div>
    </motion.div>);
};
const MessageBubble = ({ message, onQuickAction }) => {
    const isUser = message.role === 'user';

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
        >
            <div className={`max-w-[80%] space-y-2`}>
                <div
                    className={`px-4 py-3 rounded-2xl ${
                        isUser ? 'chat-message-user rounded-br-sm' : 'chat-message-ai rounded-bl-sm'
                    }`}
                >
                    {isUser ? (
                        <p className="text-sm text-foreground whitespace-pre-wrap">{message.content}</p>
                    ) : (
                        <div className="text-sm text-foreground prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown
                                components={{
                                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                    h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                                    h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                                    h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                                    ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                                    ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                                    li: ({ children }) => <li className="mb-1">{children}</li>,
                                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                    code: ({ children }) => (
                                        <code className="bg-secondary px-1 py-0.5 rounded text-xs">{children}</code>
                                    ),
                                    pre: ({ children }) => (
                                        <pre className="bg-secondary p-2 rounded overflow-x-auto mb-2">{children}</pre>
                                    ),
                                }}
                            >
                                {message.content}
                            </ReactMarkdown>
                        </div>
                    )}
                </div>

                {message.sourceRef && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground pl-2">
                        <FileText className="w-3 h-3" />
                        <span>{message.sourceRef.documentName}</span>
                        <span>·</span>
                        <span>Page {message.sourceRef.pageNumber}</span>
                    </div>
                )}

                {!isUser && (
                    <div className="flex flex-wrap gap-1.5 pl-2">
                        {quickActions.map((action) => (
                            <motion.button
                                key={action.action}
                                onClick={() => onQuickAction(action.action)}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary/50 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-smooth"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <action.icon className="w-3 h-3" />
                                {action.label}
                            </motion.button>
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );
};
