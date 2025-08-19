// src/importers.ts
import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { Project } from "./agent";

type Skill = "CNC" | "Build" | "Paint" | "AV" | "Pack & Load";

export async function parseFileToProjects(file: File): Promise<Project[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) {
    const text = await file.text();
    return parseCsv(text);
  }
  const buf = await file.arrayBuffer();
  return parseXlsx(buf);
}

function parseCsv(text: string): Project[] {
  const res = Papa.parse(text, { header: true, skipEmptyLines: true });
  const rows = (res.data as any[]) || [];
  return mapRowsToProjects(rows);
}

function parseXlsx(buf: ArrayBuffer): Project[] {
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: "" }) as any[];
  return mapRowsToProjects(rows);
}

function mapRowsToProjects(rows: any[]): Project[] {
  const SKILLS: Skill[] = ["CNC","Build","Paint","AV","Pack & Load"];

  const normKey = (k:string) => k.toLowerCase().replace(/\s+/g,"").replace(/[^\w]/g,"");
  const col = (obj:any, candidates:string[], fallback="") => {
    const nk = Object.fromEntries(Object.keys(obj).map(k=>[normKey(k),k]));
    for (const c of candidates) { const hit = nk[normKey(c)]; if (hit) return obj[hit]; }
    return obj[fallback] ?? "";
  };

  return rows.map((r, idx) => {
    const id = String(col(r, ["Job#","JobNo","ID","Ref"], "id") || `row-${idx+1}`);
    const name = String(col(r, ["Job Name","Name","Project"], "name") || id);
    const truck = col(r, ["MUST FILL Truck Load Date","Truck Load Date","Truck Leave Date","Leave Date","TruckDate","Install Truck Date"], "truckDate");
    const weeksBefore = Number(col(r, ["Weeks to Build in Wkshop","Lead Weeks","WeeksBefore","Lead"], "weeksBefore") || 0);
    const probability = col(r, ["Probability","Prob"], "probability");
    const projectType = col(r, ["Project Type","Type"], "projectType");

    const cnc = Number(col(r, ["CNC"], "CNC") || 0);
    const build = Number(col(r, ["Build"], "Build") || 0);
    const paint = Number(col(r, ["Paint"], "Paint") || 0);
    const av = Number(col(r, ["AV"], "AV") || 0);
    const pack = Number(col(r, ["Pack & Load","Pack","Pack&Load"], "Pack & Load") || 0);

    const onsiteHours = Number(col(r, ["Trade Onsite","Onsite Hours"], "onsiteHours") || 0);
    const onsiteWeeks = Number(col(r, ["Onsite Weeks (WHOLE NUMBERS)","Onsite Weeks"], "onsiteWeeks") || 0);

    return {
      id, name,
      truckDate: String(truck || ""),
      weeksBefore: Number.isFinite(weeksBefore) ? weeksBefore : 0,
      probability: probability === "" ? null : Number(probability),
      projectType: projectType ? String(projectType) : null,
      hoursBySkill: { "CNC": cnc, "Build": build, "Paint": paint, "AV": av, "Pack & Load": pack },
      onsite: { hours: onsiteHours, weeks: Math.floor(onsiteWeeks || 0) },
      curveMode: "Mathematician",
    } as Project;
  });
}
