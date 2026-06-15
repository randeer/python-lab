import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Send, Bot, User, AlertCircle, HelpCircle, Lightbulb, Compass, RotateCcw } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  text: string;
}

interface AIPanelProps {
  currentCode: string;
  lessonTitle: string;
  lessonInstructions: string;
  onTrackAIInteraction: () => void;
}

export default function AIPanel({
  currentCode,
  lessonTitle,
  lessonInstructions,
  onTrackAIInteraction,
}: AIPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "👋 Hello there! I'm **PyGuide**, your companion Python Coach. I am holding a virtual magnifier over your editor! Ask me about: \n- Math operators\n- Indentation errors\n- Tips on how to structure lists\n\nHow can I speed up your coding adventure today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (customText?: string) => {
    const question = (customText || input).trim();
    if (!question) return;

    if (!customText) {
      setInput("");
    }

    const newUserMessage: Message = { role: "user", text: question };
    setMessages((prev) => [...prev, newUserMessage]);
    setLoading(true);
    setErrorStatus(null);

    // Track for badge unlocking
    onTrackAIInteraction();

    try {
      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: currentCode,
          exerciseTitle: lessonTitle,
          exerciseDescription: lessonInstructions,
          userInput: question,
          history: messages.slice(-5), // Pass last 5 exchanges to preserve light server context
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "The AI session timed out or server is configuring.");
      }

      const data = await response.json();
      setMessages((prev) => [...prev, { role: "assistant", text: data.reply }]);
    } catch (err: any) {
      setErrorStatus(err.message || "Something went wrong.");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `⚠️ **Oops!** I couldn't reach the server. Make sure you set your \`GEMINI_API_KEY\` in **Settings > Secrets** so I can jump directly into your editor!`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickQuestions = [
    { text: "Help! Why is my code failing?", label: "Debug", icon: <AlertCircle className="w-3.5 h-3.5 text-rose-400" /> },
    { text: "Explain my currently written code simply.", label: "Explain Code", icon: <HelpCircle className="w-3.5 h-3.5 text-blue-400" /> },
    { text: "Give me an intuitive real-world analogy for today's lesson.", label: "Real-world Analogy", icon: <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> },
  ];

  return (
    <div id="ai-tutor-panel" className="flex flex-col h-full bg-slate-900/90 text-slate-100 font-sans border border-slate-800/80 rounded-xl overflow-hidden shadow-xl">
      {/* Panel Header */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 p-3.5 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100 tracking-tight flex items-center gap-1.5">
              PyGuide Tutor
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            </h3>
            <p className="text-[10px] text-slate-400">AI Python Coach • Online</p>
          </div>
        </div>
        <button
          id="clear-chat-btn"
          onClick={() => {
            setMessages([
              {
                role: "assistant",
                text: "✨ Chat logs reset! What other Python challenge can I analyze for you today?",
              },
            ]);
            setErrorStatus(null);
          }}
          className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800/60 border border-slate-700/60 flex items-center gap-1 transition-all"
        >
          <RotateCcw className="w-3 h-3" />
          Reset Chat
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex items-start gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === "user"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
              }`}
            >
              {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>
            
            <div
              className={`max-w-[85%] rounded-2xl p-3 leading-relaxed shadow-sm whitespace-pre-line ${
                msg.role === "user"
                  ? "bg-emerald-600/10 text-emerald-100 rounded-tr-none border border-emerald-500/20"
                  : "bg-slate-800/80 text-slate-200 rounded-tl-none border border-slate-850"
              }`}
            >
              {/* Basic HTML/Code/Bold formatter for simulated markdown rendering */}
              {msg.text.split("\n").map((line, blockIdx) => {
                // If line contains markdown-like headers or code blocks
                if (line.startsWith("###")) {
                  return <h4 key={blockIdx} className="font-bold text-slate-100 my-1 text-sm">{line.replace("###", "")}</h4>;
                }
                if (line.startsWith("-")) {
                  return <div key={blockIdx} className="pl-2 ml-1 text-slate-300">⚡ {line.substring(2)}</div>;
                }
                
                // Perform micro replacements for bold, inline code, etc.
                let renderedLine = line;
                // Bold formatting
                renderedLine = renderedLine.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
                // Code formatting
                renderedLine = renderedLine.replace(/`(.*?)`/g, "<code class='bg-slate-900 border border-slate-800 px-1 py-0.5 rounded text-indigo-300 font-mono text-[11px]'>$1</code>");

                return (
                  <p
                    key={blockIdx}
                    dangerouslySetInnerHTML={{ __html: renderedLine }}
                    className="mb-1"
                  />
                );
              })}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 animate-spin">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="bg-slate-800/40 border border-slate-800/60 rounded-2xl rounded-tl-none p-3 max-w-[80%] flex items-center gap-2">
              <span className="text-slate-400">Analyzing variables and structure...</span>
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce delay-75"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce delay-150"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce delay-200"></span>
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Suggested helper prompts scroll */}
      <div className="px-3 py-1.5 bg-slate-950/40 border-t border-slate-850 flex gap-2 overflow-x-auto select-none">
        {quickQuestions.map((qq, index) => (
          <button
            key={index}
            id={`quick-question-${index}`}
            onClick={() => sendMessage(qq.text)}
            className="flex-shrink-0 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-slate-100 font-sans text-[11px] rounded-lg px-2.5 py-1.5 border border-slate-700/60 flex items-center gap-1.5 transition-all"
          >
            {qq.icon}
            {qq.label}
          </button>
        ))}
      </div>

      {/* Message Input Box */}
      <form
        id="tutor-chat-form"
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
        className="p-2.5 bg-slate-950/80 border-t border-slate-800 flex items-center gap-2"
      >
        <input
          id="tutor-chat-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask PyGuide a question..."
          className="flex-1 bg-slate-800/80 text-slate-100 text-xs rounded-xl px-3.5 py-2.5 border border-slate-700/60 focus:outline-none focus:border-indigo-500 transition-colors"
          disabled={loading}
        />
        <button
          id="tutor-chat-send-btn"
          type="submit"
          className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-750 text-white flex items-center justify-center transition-colors disabled:opacity-40"
          disabled={!input.trim() || loading}
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
