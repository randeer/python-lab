import React, { useState, useEffect, useRef } from "react";
import { 
  Terminal, 
  BookOpen, 
  Award, 
  Code2, 
  Play, 
  CheckCircle, 
  AlertTriangle, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  Trophy, 
  User, 
  RefreshCw, 
  Flame, 
  ChevronDown,
  Menu,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PYTHON_MODULES, BADGES } from "./data";
import { Lesson, UserProgress, Badge } from "./types";
import { runPythonCode, validateLesson } from "./utils/pythonRunner";
import Keypad from "./components/Keypad";
import AIPanel from "./components/AIPanel";

const INITIAL_PROGRESS: UserProgress = {
  completedLessons: {},
  savedCode: {},
  xp: 0,
  streak: 1,
  lastActiveDate: null,
  unlockedBadges: []
};

// Mock leaderboards for gamification
const MOCK_LEADERBOARD = [
  { name: "Yuki M.", xp: 320, badge: "Flow Maestro" },
  { name: "Devon S.", xp: 250, badge: "Python Pioneer" },
  { name: "Sofia G.", xp: 190, badge: "Codex Scholar" },
  { name: "You", xp: 0, badge: "Newbie" },
  { name: "Liam K.", xp: 80, badge: "Newbie" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<"learn" | "sandbox" | "leaderboard" | "ai-tutor">("learn");
  const [selectedModuleIdx, setSelectedModuleIdx] = useState(0);
  const [selectedLessonIdx, setSelectedLessonIdx] = useState(0);
  
  // Code editor states
  const [code, setCode] = useState("");
  const [sandboxCode, setSandboxCode] = useState("# Try any Python code here!\nprint(\"Hello Sandbox!\")\n\ntemp = 33\nif temp > 30:\n    print(\"Obsidian dark mode rules!\")\n");
  
  // Execution outcomes
  const [stdout, setStdout] = useState<string[]>([]);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [validationMsg, setValidationMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  
  // Local user metrics
  const [progress, setProgress] = useState<UserProgress>(INITIAL_PROGRESS);
  const [toastBadge, setToastBadge] = useState<Badge | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const module = PYTHON_MODULES[selectedModuleIdx];
  const lesson = module ? module.lessons[selectedLessonIdx] : null;

  // Retrieve and record progress on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("python_lab_progress");
      if (stored) {
        const parsed = JSON.parse(stored);
        
        // Calculate Streak based on active dates
        let currentStreak = parsed.streak || 1;
        const todayStr = new Date().toDateString();
        if (parsed.lastActiveDate && parsed.lastActiveDate !== todayStr) {
          const lastDate = new Date(parsed.lastActiveDate);
          const diffTime = Math.abs(new Date().getTime() - lastDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            currentStreak += 1;
          } else if (diffDays > 1) {
            currentStreak = 1; // broken streak
          }
        }
        
        setProgress({
          ...parsed,
          streak: currentStreak,
          lastActiveDate: todayStr
        });
      } else {
        setProgress({
          ...INITIAL_PROGRESS,
          lastActiveDate: new Date().toDateString()
        });
      }
    } catch (e) {
      console.error("Error reading progress", e);
    }
  }, []);

  // Update starting code whenever passive lesson choice swaps
  useEffect(() => {
    if (lesson) {
      const saved = progress.savedCode[lesson.id];
      setCode(saved || lesson.initialCode);
      // Clear status outcomes
      setStdout([]);
      setErrorText(null);
      setValidationMsg(null);
      setIsSuccess(false);
    }
  }, [selectedModuleIdx, selectedLessonIdx, lesson, progress.savedCode]);

  // Persists progress state changes
  const saveProgress = (updated: UserProgress) => {
    setProgress(updated);
    localStorage.setItem("python_lab_progress", JSON.stringify(updated));
  };

  const handleCodeChange = (newCode: string) => {
    if (activeTab === "learn") {
      setCode(newCode);
      const updatedSaved = { ...progress.savedCode, [lesson!.id]: newCode };
      saveProgress({
        ...progress,
        savedCode: updatedSaved
      });
    } else {
      setSandboxCode(newCode);
    }
  };

  // Run Simulator Engine
  const handleExecuteCode = () => {
    setIsRunning(true);
    const activeCode = activeTab === "learn" ? code : sandboxCode;
    
    setTimeout(() => {
      const result = runPythonCode(activeCode);
      setStdout(result.output);
      setErrorText(result.error);
      setIsRunning(false);

      if (activeTab === "learn" && lesson) {
        const validation = validateLesson(lesson, result, activeCode);
        setValidationMsg(validation.feedback);
        setIsSuccess(validation.success);

        if (validation.success) {
          handleAwardXP(lesson.id, lesson.xpReward);
        }
      } else {
        // Just small award for using the sandbox
        handleAwardXP("sandbox_run", 5);
      }
    }, 400); // Tiny latency for execution reality
  };

  // Award XP and Badge Checking
  const handleAwardXP = (taskKey: string, amount: number) => {
    const isCompletedAlready = progress.completedLessons[taskKey];
    if (isCompletedAlready && taskKey !== "sandbox_run") return;

    const newXP = progress.xp + amount;
    const newCompleted = { ...progress.completedLessons, [taskKey]: true };
    
    // Check Badge achievements
    const newlyBadges = [...progress.unlockedBadges];
    BADGES.forEach((badge) => {
      if (!newlyBadges.includes(badge.id) && newXP >= badge.xpRequired) {
        newlyBadges.push(badge.id);
        // Show celebratory toast notification
        setToastBadge(badge);
      }
    });

    saveProgress({
      ...progress,
      completedLessons: newCompleted,
      xp: newXP,
      unlockedBadges: newlyBadges
    });
  };

  // Trigger Badge manually if they chat with AI
  const handleAITriggerBadge = () => {
    if (!progress.unlockedBadges.includes("ai_collaborator")) {
      const newlyBadges = [...progress.unlockedBadges, "ai_collaborator"];
      const matchedBadge = BADGES.find(b => b.id === "ai_collaborator");
      if (matchedBadge) {
        setToastBadge(matchedBadge);
      }
      saveProgress({
        ...progress,
        unlockedBadges: newlyBadges,
        xp: progress.xp + 25
      });
    }
  };

  // Render Line Gutter numbers beautifully
  const renderLineNumbers = () => {
    const activeText = activeTab === "learn" ? code : sandboxCode;
    const totalLines = Math.max(activeText.split("\n").length, 1);
    return Array.from({ length: totalLines }).map((_, i) => (
      <div key={i} className="text-right pr-2 text-slate-600 font-mono text-xs select-none leading-relaxed leading-[21px]">
        {i + 1}
      </div>
    ));
  };

  const handleNextLesson = () => {
    if (selectedLessonIdx < module.lessons.length - 1) {
      setSelectedLessonIdx(prev => prev + 1);
    } else if (selectedModuleIdx < PYTHON_MODULES.length - 1) {
      setSelectedModuleIdx(prev => prev + 1);
      setSelectedLessonIdx(0);
    }
    setIsSidebarOpen(false);
  };

  const handlePrevLesson = () => {
    if (selectedLessonIdx > 0) {
      setSelectedLessonIdx(prev => prev - 1);
    } else if (selectedModuleIdx > 0) {
      setSelectedModuleIdx(prev => prev - 1);
      setSelectedLessonIdx(PYTHON_MODULES[selectedModuleIdx - 1].lessons.length - 1);
    }
    setIsSidebarOpen(false);
  };

  // Combine leaderboard with user dynamic real score
  const dynamicLeaderboard = MOCK_LEADERBOARD.map(player => {
    if (player.name === "You") {
      // Find highest descriptive unlocked badge or Newbie
      let topBadge = "Newbie";
      if (progress.unlockedBadges.includes("codex_scholar")) topBadge = "Codex Scholar";
      else if (progress.unlockedBadges.includes("control_wizard")) topBadge = "Flow Maestro";
      else if (progress.unlockedBadges.includes("first_steps")) topBadge = "Python Pioneer";

      return {
        ...player,
        xp: progress.xp,
        badge: topBadge
      };
    }
    return player;
  }).sort((a, b) => b.xp - a.xp);

  return (
    <div id="application-root" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-text">
      
      {/* Dynamic Badge unlock toast celebration */}
      <AnimatePresence>
        {toastBadge && (
          <motion.div 
            id={`badge-toast-${toastBadge.id}`}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-sm bg-slate-900 border border-emerald-500/50 p-4 rounded-xl shadow-2xl flex items-center gap-3.5"
          >
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${toastBadge.color} flex items-center justify-center text-white text-xl shadow-md flex-shrink-0 animate-bounce`}>
              <Award className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <span className="text-[10px] text-emerald-400 font-bold tracking-wider block">CONGRATULATIONS!</span>
              <h4 className="text-xs font-extrabold text-slate-100">{toastBadge.title}</h4>
              <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{toastBadge.description}</p>
            </div>
            <button 
              id="close-badge-toast-btn"
              onClick={() => setToastBadge(null)}
              className="text-xs text-slate-500 hover:text-white bg-slate-800 p-1 rounded-md"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persistent Top Navigation Bar */}
      <header id="main-header" className="sticky top-0 bg-slate-900/90 backdrop-blur-md border-b border-sidebar border-slate-800/80 z-40 py-2.5 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button 
            id="sidebar-toggle-btn"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 md:hidden transition-all"
            aria-label="Open syllabus"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-bold text-base shadow-sm font-mono">
              py
            </div>
            <div>
              <h1 className="text-xs font-extrabold text-slate-100 tracking-tight leading-none">PYTHON LAB</h1>
              <span className="text-[9px] text-slate-500 font-mono">MOBILE LEARNING BOX</span>
            </div>
          </div>
        </div>

        {/* User metrics header pills */}
        <div className="flex items-center gap-2.5">
          <div className="bg-slate-800/50 border border-slate-700/60 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-orange-500 fill-orange-500 animate-pulse" />
            <span className="text-xs font-bold text-orange-400 font-mono">{progress.streak} Day</span>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/60 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-amber-300 font-mono">{progress.xp} XP</span>
          </div>
        </div>
      </header>

      {/* Main Body container */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Mobile Swipeable Sidebar Menu Overlays */}
        <div id="sidebar-overlay" className={`fixed inset-0 bg-black/60 z-30 transition-opacity md:hidden ${isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`} onClick={() => setIsSidebarOpen(false)}></div>
        
        {/* Course Syllabus Drawer */}
        <aside id="course-sidebar" className={`fixed md:relative top-0 bottom-0 left-0 w-72 bg-slate-900 border-r border-slate-800/80 z-35 flex flex-col justify-between transform transition-transform md:transform-none md:z-10 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
          <div className="p-4 flex flex-col gap-4 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <span className="text-[10px] text-slate-400 font-mono tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                COURSE CURRICULUM
              </span>
              <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modules Listing */}
            <div className="space-y-4">
              {PYTHON_MODULES.map((mod, modIdx) => (
                <div key={mod.id} className="space-y-1.5" id={`sidebar-module-${mod.id}`}>
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wide px-1 flex items-center gap-1.5">
                    {mod.title}
                  </h3>
                  
                  <div className="space-y-1">
                    {mod.lessons.map((les, lesIdx) => {
                      const isSelected = selectedModuleIdx === modIdx && selectedLessonIdx === lesIdx;
                      const isDone = progress.completedLessons[les.id];

                      return (
                        <button
                          key={les.id}
                          id={`sidebar-lesson-${les.id}`}
                          onClick={() => {
                            setSelectedModuleIdx(modIdx);
                            setSelectedLessonIdx(lesIdx);
                            setActiveTab("learn");
                            setIsSidebarOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-all flex items-center justify-between gap-2 border ${
                            isSelected
                              ? "bg-indigo-600/15 border-indigo-500 text-indigo-300 font-semibold"
                              : "bg-slate-800/25 border-transparent text-slate-300 hover:bg-slate-800/60"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="text-[10px] text-slate-500 font-mono">{lesIdx + 1}.</span>
                            <span className="truncate">{les.title}</span>
                          </div>
                          {isDone ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          ) : (
                            <div className="w-2.5 h-2.5 rounded-full border border-slate-600 flex-shrink-0"></div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* User Achievement badge drawer bottom widget */}
          <div className="p-4 bg-slate-950 border-t border-slate-850">
            <span className="text-[9px] text-slate-400 font-mono tracking-wider block mb-2">LAST COMPLETED IN THEME:</span>
            <div className="flex flex-wrap gap-1.5">
              {BADGES.map((b) => {
                const unlocked = progress.unlockedBadges.includes(b.id);
                return (
                  <div
                    key={b.id}
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs border ${
                      unlocked 
                        ? `bg-gradient-to-br ${b.color} border-slate-300 text-white` 
                        : "bg-slate-800 border-slate-700 text-slate-550"
                    }`}
                    title={b.title}
                  >
                    🏆
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Interactive Sandbox Space */}
        <main className="flex-1 flex flex-col overflow-hidden">
          
          {/* Main Module Tabs selection */}
          <nav id="module-tabs" className="bg-slate-900 border-b border-slate-800 p-1 flex items-center justify-between select-none overflow-x-auto">
            <div className="flex items-center gap-1">
              <button
                id="tab-learn-btn"
                onClick={() => {
                  setActiveTab("learn");
                  setValidationMsg(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex-shrink-0 ${
                  activeTab === "learn"
                    ? "bg-slate-800 text-emerald-400 border border-slate-700/65"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Micro Lesson
              </button>

              <button
                id="tab-sandbox-btn"
                onClick={() => {
                  setActiveTab("sandbox");
                  setValidationMsg(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex-shrink-0 ${
                  activeTab === "sandbox"
                    ? "bg-slate-800 text-emerald-400 border border-slate-700/65"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                Raw Sandbox
              </button>

              <button
                id="tab-ai-coach-btn"
                onClick={() => {
                  setActiveTab("ai-tutor");
                  setValidationMsg(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex-shrink-0 ${
                  activeTab === "ai-tutor"
                    ? "bg-slate-800 text-indigo-400 border border-slate-700/65"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                AI PyGuide Coach
              </button>

              <button
                id="tab-achievements-btn"
                onClick={() => {
                  setActiveTab("leaderboard");
                  setValidationMsg(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex-shrink-0 ${
                  activeTab === "leaderboard"
                    ? "bg-slate-800 text-amber-400 border border-slate-700/65"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                Badges & Ranks
              </button>
            </div>
            
            {/* Display active course name */}
            <span className="text-[10px] text-slate-500 font-mono hidden lg:inline mr-2">
              Currently: {lesson ? lesson.title : "Scratch Sandbox"}
            </span>
          </nav>

          {/* Main workspace scroll view */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            
            {/* LEFT COLUMN: Concepts & Lessons instruction OR Sidebar details */}
            {activeTab === "learn" && lesson && (
              <div id="lesson-concept-container" className="lg:w-1/2 p-4 border-b lg:border-b-0 lg:border-r border-slate-800/80 overflow-y-auto flex flex-col gap-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col gap-2.5">
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/15">
                      {lesson.difficulty}
                    </span>
                    <span className="text-slate-500 text-xs font-mono">•</span>
                    <span className="text-indigo-400 text-[11px] font-mono">+{lesson.xpReward} XP Reward</span>
                  </div>
                  
                  <h2 className="text-base font-extrabold text-slate-100 tracking-tight leading-snug">
                    {lesson.title}
                  </h2>
                  
                  {/* Lesson explanation text code segments */}
                  <div className="text-xs text-slate-300 leading-relaxed space-y-2 whitespace-pre-wrap font-sans">
                    {lesson.conceptText.split("\n\n").map((chunk, idx) => {
                      if (chunk.startsWith("```")) {
                        return (
                          <pre key={idx} className="bg-slate-950 p-2.5 border border-slate-850 rounded-lg text-emerald-400 font-mono text-[11px] overflow-x-auto leading-relaxed my-2">
                            <code>{chunk.replace(/```python|```/g, "").trim()}</code>
                          </pre>
                        );
                      }
                      return <p key={idx}>{chunk}</p>;
                    })}
                  </div>
                </div>

                {/* Direct instructions step card */}
                <div className="bg-indigo-950/20 border border-indigo-900/35 p-3.5 rounded-xl flex flex-col gap-1.5 shadow-sm">
                  <span className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5" />
                    INSTRUCTIONS
                  </span>
                  <p className="text-xs text-slate-200 leading-relaxed font-sans">{lesson.instructions}</p>
                </div>

                {/* Active control panel next and prev buttons */}
                <div className="mt-auto pt-2 flex items-center justify-between gap-2.5">
                  <button
                    id="prev-lesson-btn"
                    onClick={handlePrevLesson}
                    disabled={selectedModuleIdx === 0 && selectedLessonIdx === 0}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold py-2.5 rounded-xl border border-slate-850 flex items-center justify-center gap-1 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <button
                    id="next-lesson-btn"
                    onClick={handleNextLesson}
                    disabled={(selectedModuleIdx === PYTHON_MODULES.length - 1) && (selectedLessonIdx === PYTHON_MODULES[selectedModuleIdx].lessons.length - 1)}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold py-2.5 rounded-xl border border-slate-850 flex items-center justify-center gap-1 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* AI Coach panel replacement of left pane when active tab is AI Tutor */}
            {activeTab === "ai-tutor" && (
              <div className="lg:w-1/2 p-4 border-b lg:border-b-0 lg:border-r border-slate-800/80 overflow-hidden flex flex-col h-full">
                <AIPanel
                  currentCode={code}
                  lessonTitle={lesson?.title || "Python Sandbox"}
                  lessonInstructions={lesson?.instructions || "Free code editing"}
                  onTrackAIInteraction={handleAITriggerBadge}
                />
              </div>
            )}

            {/* LEADERBOARD & STATS VIEW on Left Column when chosen */}
            {activeTab === "leaderboard" && (
              <div id="stats-leaderboard-container" className="lg:w-1/2 p-4 border-b lg:border-b-0 lg:border-r border-slate-800/80 overflow-y-auto flex flex-col gap-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                
                {/* Streak celebration and Level metrics */}
                <div className="bg-gradient-to-br from-indigo-900/40 via-purple-950/20 to-slate-950 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-100 flex items-center gap-1.5">
                      Your Ranking Level
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Conquer lessons to advance.</p>
                    <div className="mt-3 flex items-center gap-1">
                      <span className="font-mono text-xl font-black text-white">LVL {Math.floor(progress.xp / 100) + 1}</span>
                      <span className="text-xs text-slate-500 font-mono">({progress.xp % 100}/100 XP to next level)</span>
                    </div>
                  </div>
                  
                  {/* Circular progress bar mock */}
                  <div className="w-14 h-14 rounded-full border-4 border-slate-800 border-t-emerald-500 flex items-center justify-center font-mono text-xs font-black text-emerald-400">
                    {progress.xp % 100}%
                  </div>
                </div>

                {/* Trophies & Badges unlocked listing */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-400" />
                    Earned Badges ({progress.unlockedBadges.length} / {BADGES.length})
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {BADGES.map((b) => {
                      const isUnlocked = progress.unlockedBadges.includes(b.id);
                      return (
                        <div
                          key={b.id}
                          id={`badge-card-${b.id}`}
                          className={`p-3 rounded-xl border flex items-center gap-3 transition-colors ${
                            isUnlocked
                              ? "bg-slate-900 border-indigo-500/40"
                              : "bg-slate-900/40 border-slate-850 opacity-50"
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 bg-gradient-to-br ${isUnlocked ? b.color : "from-slate-800 to-slate-900"} text-white`}>
                            🏆
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-100">{b.title}</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{b.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Ranking Leaderboard */}
                <div className="bg-slate-900/50 border border-slate-850 rounded-xl p-3.5 space-y-2.5">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    Global Pythonistas
                  </h3>
                  <p className="text-[10px] text-slate-500">Live community benchmarks based on today's learning steps.</p>
                  
                  <div className="space-y-2 mt-2">
                    {dynamicLeaderboard.map((user, idx) => {
                      const isMe = user.name === "You";
                      return (
                        <div
                          key={idx}
                          className={`flex items-center justify-between p-2 rounded-lg text-xs border ${
                            isMe 
                              ? "bg-indigo-950/40 border-indigo-500/50" 
                              : "bg-slate-900/30 border-slate-850"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black font-mono ${
                              idx === 0 
                                ? "bg-amber-500/20 text-amber-300" 
                                : idx === 1 
                                ? "bg-slate-300/20 text-slate-300"
                                : "bg-slate-800 text-slate-400"
                            }`}>
                              {idx + 1}
                            </span>
                            <div>
                              <span className={`font-semibold ${isMe ? "text-indigo-300" : "text-slate-100"}`}>{user.name}</span>
                              <span className="text-[9px] text-slate-500 block">{user.badge}</span>
                            </div>
                          </div>
                          <span className="font-mono text-emerald-400 font-bold">{user.xp} XP</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}

            {/* RIGHT COLUMN: Code Gutter Editor & Interactive Console */}
            <div className="flex-1 flex flex-col justify-between overflow-hidden bg-slate-950/40">
              
              {/* Code Editor Body */}
              <div className="flex-1 flex flex-col min-h-[220px] overflow-hidden">
                <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between select-none">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono tracking-wide uppercase pl-2">
                      {activeTab === "learn" ? "script.py - micro learning active" : "sandbox.py - coding playground"}
                    </span>
                  </div>
                  
                  {/* Reset starting code script */}
                  {activeTab === "learn" && lesson && (
                    <button
                      id="reset-code-btn"
                      onClick={() => {
                        if(confirm("Discard code and load start template?")) {
                          handleCodeChange(lesson.initialCode);
                        }
                      }}
                      className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 border border-slate-800 p-1 px-2 rounded-lg bg-slate-950/40 transition-colors"
                    >
                      <RefreshCw className="w-3 h-3 text-slate-400 hover:rotate-180 transition-transform duration-300" />
                      Reset Code
                    </button>
                  )}
                </div>

                {/* Synced Line Gutter and custom Textarea box */}
                <div className="flex-1 flex overflow-hidden bg-[#0B0F19] p-3 border-b border-slate-850">
                  <div id="editor-gutter" className="flex flex-col select-none pr-1.5 py-0.5 border-r border-slate-800/80">
                    {renderLineNumbers()}
                  </div>
                  
                  <textarea
                    id="code-editor"
                    ref={textareaRef}
                    value={activeTab === "learn" ? code : sandboxCode}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    className="flex-1 h-full bg-transparent text-emerald-300 font-mono text-xs p-1 leading-relaxed leading-[21px] focus:outline-none resize-none caret-white overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800"
                    spellCheck="false"
                    placeholder="# Type your interactive Python content here..."
                  />
                </div>
              </div>

              {/* Symbol Keyboard Helper Tray */}
              <Keypad 
                textareaRef={textareaRef} 
                code={activeTab === "learn" ? code : sandboxCode} 
                onChangeCode={handleCodeChange} 
              />

              {/* Execution Console area & Checking Indicators */}
              <div className="bg-slate-950 p-4 border-t border-slate-800 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono tracking-wider flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5" />
                    CONSOLE STANDARD OUTPUTS
                  </span>

                  <button
                    id="run-code-btn"
                    onClick={handleExecuteCode}
                    disabled={isRunning}
                    className="bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-650 text-slate-950 text-xs font-black px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-1.5 transition-all select-none"
                  >
                    <Play className="w-4 h-4 fill-slate-950" />
                    {isRunning ? "Running..." : "Run Python"}
                  </button>
                </div>

                {/* Output visual rows */}
                <div className="bg-[#040810] border border-slate-900 rounded-xl p-3 min-h-[85px] max-h-[140px] overflow-y-auto font-mono text-[11px] leading-relaxed">
                  
                  {/* Displays normal script print outputs */}
                  {stdout.length > 0 && stdout.map((line, idx) => (
                    <div key={idx} id={`console-out-line-${idx}`} className="text-white">
                      {line}
                    </div>
                  ))}

                  {/* Displays syntax and syntax indentation exceptions */}
                  {errorText && (
                    <div id="console-error-box" className="text-rose-400 flex items-start gap-1.5 mt-1">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                      <pre className="whitespace-pre-wrap">{errorText}</pre>
                    </div>
                  )}

                  {/* Display hollow outputs indicator */}
                  {stdout.length === 0 && !errorText && (
                    <span className="text-slate-500 italic">No console print logs. Click "Run Python" above to output code.</span>
                  )}
                </div>

                {/* Validation and badges progress review container */}
                {validationMsg && (
                  <div 
                    id="lesson-validation-status"
                    className={`p-3.5 rounded-xl border flex items-start gap-2.5 font-sans text-xs ${
                      isSuccess 
                        ? "bg-emerald-900/10 border-emerald-500/40 text-emerald-300" 
                        : "bg-rose-950/15 border-rose-500/40 text-rose-300"
                    }`}
                  >
                    {isSuccess ? (
                      <CheckCircle className="w-4.5 h-4.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4.5 h-4.5 text-rose-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 space-y-1">
                      <h4 className="font-bold">{isSuccess ? "Correct Answer!" : "Refining check..."}</h4>
                      <p>{validationMsg}</p>
                      
                      {isSuccess && activeTab === "learn" && (
                        <div className="pt-2 flex gap-2 w-full">
                          <button
                            id="success-next-btn"
                            onClick={handleNextLesson}
                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-[11px] transition-colors flex items-center justify-center gap-1"
                          >
                            Next Lesson
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                          
                          <button
                            id="success-ask-coach-btn"
                            onClick={() => {
                              setActiveTab("ai-tutor");
                              setValidationMsg(null);
                            }}
                            className="bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-750 px-3 py-1.5 rounded-lg text-[11px] transition-all text-slate-300 font-sans"
                          >
                            Chat with PyGuide
                          </button>
                        </div>
                      )}
                      
                      {!isSuccess && activeTab === "learn" && lesson && (
                        <div className="pt-1 text-[11px] text-slate-300 flex items-center gap-1.5">
                          <span className="font-bold text-amber-400 text-xs">💡 Quick Hint:</span>
                          <span>{lesson.hint}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
