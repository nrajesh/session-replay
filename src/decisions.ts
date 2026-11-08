// Decision points: exact ones from AskUserQuestion, best-effort ones from free-text prompts.
import type { DecisionPoint } from './types.ts';

const REC = /\s*\((recommended)\)\s*$/i;
const clean = (label: string) => String(label ?? '').replace(REC, '').trim();

export function askDecision(input: any, result: any | undefined, at: string): DecisionPoint[] {
  const questions: any[] = Array.isArray(input?.questions) ? input.questions : [];
  const answers = result && typeof result === 'object' ? result.answers : undefined;
  return questions.map((q) => {
    const options = (Array.isArray(q.options) ? q.options : []).map((o: any) => ({
      label: clean(o.label),
      description: o.description,
      recommended: REC.test(String(o.label ?? '')),
    }));
    const d: DecisionPoint = { kind: 'ask', exact: true, at, header: q.header, question: String(q.question ?? ''), options, chosen: [] };
    const raw = answers?.[q.question];
    if (raw === undefined || raw === null) {
      d.notes = 'no answer recorded';
      return d;
    }
    const labels = new Set(options.map((o: { label: string }) => o.label));
    const whole = clean(String(raw));
    let parts: string[];
    if (Array.isArray(raw)) parts = raw.map((x) => clean(String(x)));
    else if (labels.has(whole)) parts = [whole];
    else parts = String(raw).split(',').map((p) => clean(p));
    if (!Array.isArray(raw) && !parts.every((p) => labels.has(p)) && parts.filter((p) => labels.has(p)).length === 0) {
      d.other = String(raw);
    } else {
      d.chosen = parts.filter((p) => labels.has(p));
      const rest = parts.filter((p) => p && !labels.has(p));
      if (rest.length) d.other = rest.join(', ');
    }
    const note = result?.annotations?.[q.question]?.notes;
    if (note) d.notes = String(note);
    return d;
  });
}

const APPROVAL = /^(y(es|ep|eah|up)?|ok(ay)?|sure|go( ahead)?|proceed|approved?|lgtm|sounds good|do it|ship it|continue|perfect|great|looks good|agreed?|fine|correct|right|confirm(ed)?|carry on)\b/i;
const REJECTION = /^(no|nope|nah|don'?t|do not|stop|wait|revert|undo|not (that|yet|like)|wrong|cancel|hold on)\b|\binstead\b/i;
const REQUEST = /^(please|pls|let'?s|can you|could you|would you|i want|i'?d like|we need|make|add|fix|remove|use|change|build|create|update|implement|write|run|deploy|commit|push|rename|delete|move|set|keep|try|show|start|ensure|check|refactor|replace|merge|open|close|install|test|review|plan|draft|go with|switch)\b/i;

/** Last non-empty paragraph of what the AI agent said before the prompt. */
function lastParagraph(text = ''): string {
  const paras = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const p = paras[paras.length - 1] ?? '';
  return p.length > 400 ? '…' + p.slice(-400) : p;
}

export function classifyPrompt(text: string, at: string, prevAssistantText?: string): DecisionPoint | null {
  const t = text.trim();
  if (!t) return null;
  const quote = t.length > 400 ? t.slice(0, 400) + '…' : t;
  const base = { exact: false, at, options: [], chosen: [], quote };
  const short = t.length <= 200;
  if (short && REJECTION.test(t)) return { ...base, kind: 'rejection', question: lastParagraph(prevAssistantText) };
  if (short && APPROVAL.test(t)) return { ...base, kind: 'approval', question: lastParagraph(prevAssistantText) };
  if (REQUEST.test(t)) return { ...base, kind: 'instruction', question: '' };
  if (/\?\s*$/.test(t)) return null;
  if (t.length >= 60) return { ...base, kind: 'instruction', question: '' };
  return null;
}
