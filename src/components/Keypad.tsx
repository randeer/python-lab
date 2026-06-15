import React from "react";
import { Terminal, Copy, ArrowRight, CornerDownLeft, Space } from "lucide-react";

interface KeypadProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  code: string;
  onChangeCode: (newCode: string) => void;
}

export default function Keypad({ textareaRef, code, onChangeCode }: KeypadProps) {
  const insertSymbol = (symbol: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      // Fallback if textarea ref is not resolved yet
      onChangeCode(code + symbol);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const textBefore = code.substring(0, start);
    const textAfter = code.substring(end);

    const newCode = textBefore + symbol + textAfter;
    onChangeCode(newCode);

    // Reposition cursor right after inserted text on next tick
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + symbol.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  const keypadButtons = [
    { label: "indent", value: "    ", icon: <Space className="w-4 h-4 inline mr-1" /> },
    { label: "print()", value: 'print("")' },
    { label: "=", value: " = " },
    { label: ":", value: ":" },
    { label: '"', value: '"' },
    { label: "'", value: "'" },
    { label: "[ ]", value: "[]" },
    { label: "( )", value: "()" },
    { label: "*", value: " * " },
    { label: "+", value: " + " },
    { label: "temp", value: "temp" },
    { label: "count", value: "count" },
    { label: "score", value: "score" },
    { label: "Alice", value: '"Alice"' },
    { label: "NewLine", value: "\n", icon: <CornerDownLeft className="w-4 h-4 inline" /> },
  ];

  return (
    <div id="coding-keypad-container" className="bg-slate-900 border-t border-slate-800 p-2 select-none">
      <div className="flex items-center justify-between px-2 pb-1.5 border-b border-slate-800/60 mb-2">
        <span className="text-[10px] text-slate-400 font-mono tracking-wider flex items-center gap-1.5">
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          MOBILE HELPER SYMBOLS
        </span>
        <span className="text-[9px] text-slate-500 font-sans hidden sm:inline">
          Tap elements to insert directly at cursor
        </span>
      </div>
      
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {keypadButtons.map((btn, index) => (
          <button
            key={index}
            id={`keypad-btn-${btn.label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
            onClick={() => insertSymbol(btn.value)}
            className="flex-shrink-0 bg-slate-800 active:bg-emerald-600 hover:bg-slate-700/80 text-slate-200 active:text-white font-mono text-xs font-medium px-3.5 py-2.5 rounded-lg border border-slate-700/50 shadow-sm transition-all focus:outline-none flex items-center justify-center gap-1"
          >
            {btn.icon}
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}
