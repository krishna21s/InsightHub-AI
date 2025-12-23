import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, RefreshCw, Lightbulb, FileText, HelpCircle, Eye, Camera, Upload } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
const quickActions = [
    { icon: RefreshCw, label: 'Explain again', action: 'explain' },
    { icon: Lightbulb, label: 'Give example', action: 'example' },
    { icon: FileText, label: 'Generate notes', action: 'notes' },
    { icon: HelpCircle, label: 'Create quiz', action: 'quiz' },
];
export const ChatInterface = () => {
    const { messages, addMessage, activeDocument, activeMode, isVisionActive, documents, setShowDocumentSelector } = useAppStore();
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
        if (!input.trim())
            return;
        const userMessage = {
            id: `msg-${Date.now()}`,
            role: 'user',
            content: input,
            timestamp: new Date(),
        };
        addMessage(userMessage);
        setInput('');
        setIsTyping(true);
        // Simulate AI response
        setTimeout(() => {
            const aiMessage = {
                id: `msg-${Date.now()}`,
                role: 'assistant',
                content: generateResponse(input, activeDocument?.name, activeMode),
                timestamp: new Date(),
                sourceRef: activeDocument ? {
                    documentName: activeDocument.name,
                    pageNumber: Math.floor(Math.random() * activeDocument.pageCount) + 1,
                } : undefined,
            };
            addMessage(aiMessage);
            setIsTyping(false);
        }, 1500);
    };
    const generateResponse = (query, docName, mode) => {
        const responses = [
            `Based on the analysis of ${docName || 'your question'}, I can provide the following explanation:\n\nThe concept you're asking about relates to fundamental principles that govern this domain. The key insight here is that understanding the underlying mechanisms allows for better practical application.\n\nWould you like me to elaborate on any specific aspect?`,
            `Let me break this down for you:\n\n1. **Core Concept**: The fundamental idea here involves systematic approaches to problem-solving.\n\n2. **Application**: In practice, this means applying theoretical knowledge to real-world scenarios.\n\n3. **Key Takeaway**: Understanding this relationship is crucial for mastery.\n\nShall I provide more examples?`,
            `This is an excellent question. The diagram/content you're referring to illustrates a critical relationship between components.\n\nThe visual representation shows how different elements interact within the system, creating a cohesive framework for understanding.\n\nI can generate practice questions if you'd like to test your understanding.`,
        ];
        return responses[Math.floor(Math.random() * responses.length)];
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
    return (<div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (<WelcomeMessage isVisionActive={isVisionActive} hasDocuments={hasDocuments} onSelectDocument={() => setShowDocumentSelector(true)}/>) : (<AnimatePresence>
            {messages.map((message) => (<MessageBubble key={message.id} message={message} onQuickAction={handleQuickAction}/>))}
          </AnimatePresence>)}

        {isTyping && (<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 text-muted-foreground">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (<motion.div key={i} className="w-2 h-2 rounded-full bg-primary/50" animate={{ y: [0, -6, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}/>))}
            </div>
            <span className="text-sm">AI is thinking...</span>
          </motion.div>)}

        <div ref={messagesEndRef}/>
      </div>

      {/* Vision Mode Prompt */}
      {showVisionPrompt && (<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-6 mb-4 p-4 rounded-xl bg-glow-vision/10 border border-glow-vision/30">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-glow-vision/20">
              <Eye className="w-5 h-5 text-glow-vision"/>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground mb-2">Vision Tutor Active</p>
              <p className="text-sm text-muted-foreground mb-3">
                No documents uploaded. Choose how to provide visual content:
              </p>
              <div className="flex gap-2">
                <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-glow-vision/20 text-glow-vision text-sm hover:bg-glow-vision/30 transition-smooth">
                  <Upload className="w-4 h-4"/>
                  Upload Document
                </button>
                <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-foreground text-sm hover:bg-secondary/80 transition-smooth">
                  <Camera className="w-4 h-4"/>
                  Capture Screen
                </button>
              </div>
            </div>
          </div>
        </motion.div>)}

      {/* Input Area */}
      <div className="p-4 border-t border-border bg-card/50">
        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            }
        }} placeholder={isVisionActive
            ? "Ask about diagrams, graphs, or visuals..."
            : activeDocument
                ? `Ask about ${activeDocument.name}...`
                : "Ask a question..."} className="w-full resize-none bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-smooth" rows={1}/>
          </div>
          <motion.button onClick={handleSend} disabled={!input.trim()} className="p-3 rounded-xl bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed glow-primary-strong hover:shadow-glow-lg transition-smooth" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Send className="w-5 h-5"/>
          </motion.button>
        </div>
      </div>
    </div>);
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
    return (<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] space-y-2`}>
        <div className={`px-4 py-3 rounded-2xl ${isUser
            ? 'chat-message-user rounded-br-sm'
            : 'chat-message-ai rounded-bl-sm'}`}>
          <p className="text-sm text-foreground whitespace-pre-wrap">{message.content}</p>
        </div>

        {message.sourceRef && (<div className="flex items-center gap-1.5 text-xs text-muted-foreground pl-2">
            <FileText className="w-3 h-3"/>
            <span>{message.sourceRef.documentName}</span>
            <span>·</span>
            <span>Page {message.sourceRef.pageNumber}</span>
          </div>)}

        {!isUser && (<div className="flex flex-wrap gap-1.5 pl-2">
            {quickActions.map((action) => (<motion.button key={action.action} onClick={() => onQuickAction(action.action)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary/50 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-smooth" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <action.icon className="w-3 h-3"/>
                {action.label}
              </motion.button>))}
          </div>)}
      </div>
    </motion.div>);
};
