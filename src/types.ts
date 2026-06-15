export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  shortSummary: string;
  conceptText: string;
  instructions: string;
  initialCode: string;
  solutionCode: string; // Used to help compare or as reference
  checkType: "output" | "regex" | "exact" | "contains";
  expectedOutput?: string;
  regexCheck?: string; // string representation of RegExp
  expectedKeywords?: string[]; // keywords that must be code-present
  hint: string;
  difficulty: "Beginner" | "Easy" | "Medium";
  xpReward: number;
}

export interface Module {
  id: string;
  title: string;
  description: string;
  iconName: "Terminal" | "GitFork" | "Code" | "Layers" | "Key";
  lessons: Lesson[];
}

export interface UserProgress {
  completedLessons: Record<string, boolean>;
  savedCode: Record<string, string>;
  xp: number;
  streak: number;
  lastActiveDate: string | null;
  unlockedBadges: string[];
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  iconName: string;
  xpRequired: number;
  color: string;
}
