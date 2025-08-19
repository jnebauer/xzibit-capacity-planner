// src/agent.ts
type Skill = "CNC" | "Build" | "Paint" | "AV" | "Pack & Load";

export type Project = {
  id: string;
  name: string;
  truckDate: string | null;
  weeksBefore: number;
  hoursBySkill: Record<Skill, number>;
  probability?: number | null;
  onsite?: { hours: number; weeks: number };
  projectType?: string | null;
  curveMode?: "Mathematician" | "Linear" | "Triangular";
};

export type AgentIssue = { field: string; message: string; fixed?: boolean };

const skills: Skill[] = ["CNC","Build","Paint","AV","Pack & Load"];

const clamp = (v:number, min:number, max:number) => Math.min(max, Math.max(min, v));
const toInt = (v:any) => Number.isFinite(+v) ? Math.floor(+v) : 0;
const toNum = (v:any) => Number.isFinite(+v) ? +v : 0;

export function toISO(d: Date): string {
  const y=d.getFullYear();
  const m=String(d.getMonth()+1).padStart(2,"0");
  const day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}

export function normaliseDate(input: any): string | null {
  if (!input && input !== 0) return null;
  try {
    if (typeof input === "string") {
      const t = new Date(input);
      if (!isNaN(t.getTime())) return toISO(t);
    }
    if (input instanceof Date && !isNaN(input.getTime())) return toISO(input);
    const n = +input;
    if (Number.isFinite(n)) {
      // Excel serial: days since 1899-12-30
      const base = new Date(Date.UTC(1899, 11, 30));
      const d = new Date(base.getTime() + n * 86400000);
      if (!isNaN(d.getTime())) return toISO(d);
    }
  } catch {}
  return null;
}

export function validateAndFixProject(p: Project): { fixed: Project; issues: AgentIssue[] } {
  const issues: AgentIssue[] = [];
  const fixed: Project = JSON.parse(JSON.stringify(p));

  if (!fixed.id || String(fixed.id).trim()==="") {
    fixed.id = cryptoRandomId();
    issues.push({ field: "id", message: "Missing id → generated", fixed: true });
  }
  if (!fixed.name || String(fixed.name).trim()==="") {
    fixed.name = `Untitled ${fixed.id}`;
    issues.push({ field: "name", message: "Missing name → filled", fixed: true });
  }

  // Probability 0..1 or null
  if (fixed.probability === undefined) fixed.probability = null;
  if (fixed.probability !== null) {
    const before = fixed.probability;
    fixed.probability = clamp(+before || 0, 0, 1);
    if (before !== fixed.probability) issues.push({ field: "probability", message: `Clamped to ${fixed.probability}`, fixed: true });
  }

  // Dates
  const normDate = normaliseDate(fixed.truckDate);
  if (fixed.truckDate !== normDate) issues.push({ field: "truckDate", message: "Normalised truck date", fixed: true });
  fixed.truckDate = normDate;

  // Integers / non-negatives
  const wb = toInt(fixed.weeksBefore);
  if (wb < 0) { issues.push({ field:"weeksBefore", message:"< 0 → set to 0", fixed: true }); }
  fixed.weeksBefore = Math.max(0, wb);

  // Hours by skill
  fixed.hoursBySkill = fixed.hoursBySkill || ({} as any);
  for (const sk of skills) {
    const v = toNum(fixed.hoursBySkill[sk] || 0);
    if (v < 0) { issues.push({ field:`hoursBySkill.${sk}`, message:"Negative → set to 0", fixed: true }); }
    fixed.hoursBySkill[sk] = Math.max(0, v);
  }

  // Onsite
  const onsite = fixed.onsite || { hours: 0, weeks: 0 };
  const oh = Math.max(0, toNum(onsite.hours));
  const ow = Math.max(0, toInt(onsite.weeks));
  if (oh !== onsite.hours) issues.push({ field:"onsite.hours", message:"Normalised", fixed: true });
  if (ow !== onsite.weeks) issues.push({ field:"onsite.weeks", message:"Normalised", fixed: true });
  fixed.onsite = { hours: oh, weeks: ow };

  // Curve defaults
  if (!fixed.curveMode) fixed.curveMode = "Mathematician";

  return { fixed, issues };
}

function cryptoRandomId() {
  try {
    const a = crypto.getRandomValues(new Uint8Array(8));
    return Array.from(a).map(x=>x.toString(16).padStart(2,"0")).join("");
  } catch {
    return Math.random().toString(16).slice(2,10);
  }
}
