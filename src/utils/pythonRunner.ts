import { Lesson } from "../types";

export interface RunResult {
  output: string[];
  error: string | null;
  variables: Record<string, any>;
  suggestions?: string[];
}

/**
 * A highly resilient, lightweight client-side simulator for beginner Python tasks.
 * Evaluates variables, basic math operations, list assignments, simple conditional blocks, 
 * counts loops, and records 'print()' values. Operates step by step to simulate actual runs.
 */
export function runPythonCode(code: string): RunResult {
  const output: string[] = [];
  const variables: Record<string, any> = {};
  let error: string | null = null;

  const lines = code.split("\n");

  // Helper to safely evaluate string vs numeric vs variable values
  function resolveValue(expr: string, context: Record<string, any>): any {
    expr = expr.trim();
    if ((expr.startsWith('"') && expr.endsWith('"')) || (expr.startsWith("'") && expr.endsWith("'"))) {
      return expr.substring(1, expr.length - 1);
    }
    if (expr === "True" || expr === "true") return true;
    if (expr === "False" || expr === "false") return false;
    
    // Check if it's a list literal e.g. ["red", "green"]
    if (expr.startsWith("[") && expr.endsWith("]")) {
      const itemsStr = expr.substring(1, expr.length - 1).trim();
      if (!itemsStr) return [];
      
      // Basic comma splitter while ignoring commas in quotes
      const items: any[] = [];
      let temp = "";
      let doubleQ = false;
      let singleQ = false;
      for (let i = 0; i < itemsStr.length; i++) {
        const c = itemsStr[i];
        if (c === '"' && itemsStr[i-1] !== '\\') doubleQ = !doubleQ;
        else if (c === "'" && itemsStr[i-1] !== '\\') singleQ = !singleQ;
        
        if (c === ',' && !doubleQ && !singleQ) {
          items.push(resolveValue(temp, context));
          temp = "";
        } else {
          temp += c;
        }
      }
      if (temp.trim()) {
        items.push(resolveValue(temp, context));
      }
      return items;
    }

    // Check if it's a list index access e.g., colors[0]
    const listIndexMatch = expr.match(/^([a-zA-Z_]\w*)\s*\[\s*(.+)\s*\]$/);
    if (listIndexMatch) {
      const listName = listIndexMatch[1];
      const idxExpr = listIndexMatch[2];
      const index = Number(resolveValue(idxExpr, context));
      if (listName in context) {
        const arr = context[listName];
        if (Array.isArray(arr)) {
          if (index >= 0 && index < arr.length) {
            return arr[index];
          }
          throw new Error(`IndexError: list index out of range`);
        }
      }
      throw new Error(`NameError: name '${listName}' is not defined`);
    }

    // Check if it is a number
    if (/^-?\d+(\.\d+)?$/.test(expr)) {
      return Number(expr);
    }

    // Check if it is a registered variable
    if (expr in context) {
      return context[expr];
    }

    // Try basic math with context variables replaced
    try {
      let substituted = expr;
      // Sort keys descending so variables that are substrings of others are replaced correctly
      const sortedKeys = Object.keys(context).sort((a,b) => b.length - a.length);
      for (const key of sortedKeys) {
        const regex = new RegExp(`\\b${key}\\b`, 'g');
        const val = context[key];
        substituted = substituted.replace(regex, typeof val === 'string' ? `"${val}"` : String(val));
      }
      // Only allow safe math characters
      if (/^[0-9+\-*/().\s"']+$/.test(substituted)) {
        // eslint-disable-next-line no-eval
        return eval(substituted);
      }
    } catch {
      // Ignore and throw NameError below
    }

    throw new Error(`NameError: name '${expr}' is not defined`);
  }

  // Helper to execute block of lines with context
  function executeLines(blockLines: string[], context: Record<string, any>, indentLevel: number): void {
    let i = 0;
    
    while (i < blockLines.length) {
      const line = blockLines[i];
      const trimmed = line.trim();
      
      if (!trimmed || trimmed.startsWith("#")) {
        i++;
        continue;
      }

      // 1. Check if it's a print call
      if (trimmed.startsWith("print(") && trimmed.endsWith(")")) {
        const inside = trimmed.substring(6, trimmed.length - 1).trim();
        if (inside === "") {
          output.push("");
        } else {
          // Supports print("Text:", variable) or simple arguments
          const args: string[] = [];
          let currentArg = "";
          let inDoubleQuotes = false;
          let inSingleQuotes = false;
          
          for (let charIdx = 0; charIdx < inside.length; charIdx++) {
            const char = inside[charIdx];
            if (char === '"' && inside[charIdx - 1] !== '\\') {
              inDoubleQuotes = !inDoubleQuotes;
              currentArg += char;
            } else if (char === "'" && inside[charIdx - 1] !== '\\') {
              inSingleQuotes = !inSingleQuotes;
              currentArg += char;
            } else if (char === ',' && !inDoubleQuotes && !inSingleQuotes) {
              args.push(currentArg.trim());
              currentArg = "";
            } else {
              currentArg += char;
            }
          }
          if (currentArg.trim()) {
            args.push(currentArg.trim());
          }

          const resolvedArgs = args.map(arg => {
            try {
              const res = resolveValue(arg, context);
              if (Array.isArray(res)) {
                return "[" + res.map(x => typeof x === 'string' ? `'${x}'` : x).join(", ") + "]";
              }
              return String(res);
            } catch (err: any) {
              // If it's literally plain quotes inside, or general evaluation failing, fallback representation
              return arg.replace(/^["']|["']$/g, '');
            }
          });
          output.push(resolvedArgs.join(" "));
        }
        i++;
        continue;
      }

      // 2. Variable assignments (including +=, -=, *=, /=, =)
      const assignmentMatch = trimmed.match(/^([a-zA-Z_]\w*)\s*(\+=|-=|\*=|\/==|=)\s*(.+)$/);
      if (assignmentMatch) {
         const varName = assignmentMatch[1];
         const operator = assignmentMatch[2];
         const valExpr = assignmentMatch[3].trim();
         
         const evaluated = resolveValue(valExpr, context);
         if (operator === "=") {
           context[varName] = evaluated;
         } else if (operator === "+=") {
           if (!(varName in context)) throw new Error(`NameError: name '${varName}' is not defined`);
           context[varName] = context[varName] + evaluated;
         } else if (operator === "-=") {
           if (!(varName in context)) throw new Error(`NameError: name '${varName}' is not defined`);
           context[varName] = context[varName] - evaluated;
         } else if (operator === "*=") {
           if (!(varName in context)) throw new Error(`NameError: name '${varName}' is not defined`);
           context[varName] = context[varName] * evaluated;
         }
         i++;
         continue;
      }

      // 3. Conditional loops/if statements
      if (trimmed.startsWith("if ") && trimmed.endsWith(":")) {
        const conditionExpr = trimmed.substring(3, trimmed.length - 1).trim();
        const compMatch = conditionExpr.match(/^(.+?)\s*(>|<|==|!=|>=|<=)\s*(.+)$/);
        let conditionMet = false;
        
        if (compMatch) {
          const leftVal = resolveValue(compMatch[1], context);
          const op = compMatch[2];
          const rightVal = resolveValue(compMatch[3], context);
          
          switch (op) {
            case ">": conditionMet = leftVal > rightVal; break;
            case "<": conditionMet = leftVal < rightVal; break;
            case "==": conditionMet = leftVal === rightVal; break;
            case "!=": conditionMet = leftVal !== rightVal; break;
            case ">=": conditionMet = leftVal >= rightVal; break;
            case "<=": conditionMet = leftVal <= rightVal; break;
          }
        } else {
          try {
            const val = resolveValue(conditionExpr, context);
            conditionMet = !!val;
          } catch {
            conditionMet = false;
          }
        }

        // Extract indented lines
        const ifBlockLines: string[] = [];
        let j = i + 1;
        const parentIndent = line.search(/\S/);
        
        while (j < blockLines.length) {
          const nextLine = blockLines[j];
          if (nextLine.trim() === "") {
            j++;
            continue;
          }
          const nextIndent = nextLine.search(/\S/);
          if (nextIndent > parentIndent) {
            ifBlockLines.push(nextLine);
            j++;
          } else {
            break;
          }
        }

        if (ifBlockLines.length === 0) {
          throw new Error("IndentationError: expected an indented block after 'if' statement");
        }

        if (conditionMet) {
          executeLines(ifBlockLines, context, indentLevel + 1);
        }
        
        i = j;
        continue;
      }

      // 4. For loops: for color in colors: OR for i in range(5):
      if (trimmed.startsWith("for ") && trimmed.endsWith(":")) {
        const header = trimmed.substring(4, trimmed.length - 1).trim(); 
        const inIdx = header.indexOf(" in ");
        if (inIdx === -1) {
          throw new Error("SyntaxError: invalid syntax (missing 'in' inside for-loop statement)");
        }
        const iteratorVar = header.substring(0, inIdx).trim();
        const iterableExpr = header.substring(inIdx + 4).trim();

        // Resolve iterable values
        let iterableItems: any[] = [];
        if (iterableExpr.startsWith("range(") && iterableExpr.endsWith(")")) {
          const rangeArgsStr = iterableExpr.substring(6, iterableExpr.length - 1).trim();
          const rangeArgs = rangeArgsStr.split(",").map(arg => Number(resolveValue(arg, context)));
          
          let start = 0;
          let stop = 0;
          let step = 1;
          
          if (rangeArgs.length === 1) {
            stop = rangeArgs[0];
          } else if (rangeArgs.length === 2) {
            start = rangeArgs[0];
            stop = rangeArgs[1];
          } else if (rangeArgs.length === 3) {
            start = rangeArgs[0];
            stop = rangeArgs[1];
            step = rangeArgs[2];
          }

          for (let val = start; step > 0 ? val < stop : val > stop; val += step) {
            iterableItems.push(val);
            if (iterableItems.length > 200) break; // Infinite check
          }
        } else {
          try {
            const resolved = resolveValue(iterableExpr, context);
            if (Array.isArray(resolved)) {
              iterableItems = resolved;
            } else if (typeof resolved === "string") {
              iterableItems = resolved.split("");
            } else {
              throw new Error(`TypeError: '${typeof resolved}' object is not iterable`);
            }
          } catch (e: any) {
            throw new Error(`TypeError: '${iterableExpr}' object is not iterable`);
          }
        }

        // Extract indented lines
        const forBlockLines: string[] = [];
        let j = i + 1;
        const parentIndent = line.search(/\S/);
        
        while (j < blockLines.length) {
          const nextLine = blockLines[j];
          if (nextLine.trim() === "") {
            j++;
            continue;
          }
          const nextIndent = nextLine.search(/\S/);
          if (nextIndent > parentIndent) {
            forBlockLines.push(nextLine);
            j++;
          } else {
            break;
          }
        }

        if (forBlockLines.length === 0) {
          throw new Error("IndentationError: expected an indented block after 'for' statement");
        }

        // Run iteratively
        for (const item of iterableItems) {
          const localContext = { ...context, [iteratorVar]: item };
          executeLines(forBlockLines, localContext, indentLevel + 1);
          // Sync mutations
          Object.keys(localContext).forEach(key => {
            context[key] = localContext[key];
          });
        }

        i = j;
        continue;
      }

      // 5. While loops: while count < 3:
      if (trimmed.startsWith("while ") && trimmed.endsWith(":")) {
        const conditionExpr = trimmed.substring(6, trimmed.length - 1).trim();

        // Extract indented lines
        const whileBlockLines: string[] = [];
        let j = i + 1;
        const parentIndent = line.search(/\S/);
        
        while (j < blockLines.length) {
          const nextLine = blockLines[j];
          if (nextLine.trim() === "") {
            j++;
            continue;
          }
          const nextIndent = nextLine.search(/\S/);
          if (nextIndent > parentIndent) {
            whileBlockLines.push(nextLine);
            j++;
          } else {
            break;
          }
        }

        if (whileBlockLines.length === 0) {
          throw new Error("IndentationError: expected an indented block after 'while' statement");
        }

        // Evaluate while condition dynamically
        let loopGuardCounter = 0;
        const evaluateCondition = (): boolean => {
          const compMatch = conditionExpr.match(/^(.+?)\s*(>|<|==|!=|>=|<=)\s*(.+)$/);
          if (compMatch) {
            const leftVal = resolveValue(compMatch[1], context);
            const op = compMatch[2];
            const rightVal = resolveValue(compMatch[3], context);
            
            switch (op) {
              case ">": return leftVal > rightVal;
              case "<": return leftVal < rightVal;
              case "==": return leftVal === rightVal;
              case "!=": return leftVal !== rightVal;
              case ">=": return leftVal >= rightVal;
              case "<=": return leftVal <= rightVal;
            }
          }
          try {
            return !!resolveValue(conditionExpr, context);
          } catch {
            return false;
          }
        };

        // Run loop safely
        while (evaluateCondition()) {
          loopGuardCounter++;
          if (loopGuardCounter > 150) {
            throw new Error("TimeoutError: Maximum loop iterations exceeded to prevent mobile page freezing! Ensure your variables decrement or increment properly.");
          }
          executeLines(whileBlockLines, context, indentLevel + 1);
        }

        i = j;
        continue;
      }

      // 6. Function definitions
      if (trimmed.startsWith("def ") && trimmed.endsWith(":")) {
        const defMatch = trimmed.match(/^def\s+([a-zA-Z_]\w*)\s*\((.*)\)\s*:$/);
        const fnName = defMatch ? defMatch[1] : "custom_fn";
        context[fnName] = "Function defined";

        let j = i + 1;
        const parentIndent = line.search(/\S/);
        while (j < blockLines.length) {
          const nextLine = blockLines[j];
          if (nextLine.trim() === "" || nextLine.search(/\S/) > parentIndent) {
            j++;
          } else {
            break;
          }
        }
        i = j;
        continue;
      }

      i++;
    }
  }

  try {
    executeLines(lines, variables, 0);
  } catch (err: any) {
    error = err.message || "SyntaxError: invalid syntax";
  }

  return { output, error, variables };
}

/**
 * Validates if the user's execution results meet the current Python lesson requirements.
 */
export function validateLesson(lesson: Lesson, result: RunResult, userCode: string): { success: boolean; feedback: string } {
  // Key word check
  if (lesson.expectedKeywords) {
    for (const kw of lesson.expectedKeywords) {
      if (!userCode.includes(kw)) {
        return {
          success: false,
          feedback: `Your code seems to be missing the required keywords, loop variables, or function names like: "${kw}".`
        };
      }
    }
  }

  if (result.error) {
    return { success: false, feedback: `Python execution threw an error: ${result.error}. Take a look and retry or ask the AI Coach!` };
  }

  // Double check according to verify types
  if (lesson.checkType === "output") {
    const outputMatchesStr = result.output.includes(lesson.expectedOutput || "");
    if (outputMatchesStr) {
      return { success: true, feedback: `Astounding! You created an exact print statement outcome.` };
    }
    return {
      success: false,
      feedback: `Your actual printed output was [${result.output.join(", ")}]. We expected it to contain "${lesson.expectedOutput}". Try editing your print output!`
    };
  }

  if (lesson.checkType === "regex" && lesson.regexCheck) {
    const rx = new RegExp(lesson.regexCheck);
    if (rx.test(userCode)) {
      return { success: true, feedback: "Splendid work! Code parsed successfully and satisfied calculations." };
    }
    return {
      success: false,
      feedback: "The arithmetic or formatting looks a little off. Make sure you match the loop criteria exactly!"
    };
  }

  if (lesson.checkType === "exact") {
    // Check if expected output list matches perfectly
    const matchesAll = lesson.expectedOutput ? result.output.join("\n").trim() === lesson.expectedOutput.trim() : true;
    if (matchesAll) {
      return { success: true, feedback: "Wow! Your loop printed the exact progression expected!" };
    }
    return {
      success: false,
      feedback: `Your loop output was: \n${result.output.join("\n")}\n\nBut we expected precisely:\n${lesson.expectedOutput}`
    };
  }

  return { success: true, feedback: "Brilliant! Your code successfully runs out with neat variable maps." };
}
