// Shared Recharts chrome tokens. SVG attributes don't resolve
// CSS var(), so the grid/axis/series values below are hex
// literals that mirror the --xz-* tokens defined in
// app/local.css (the 5-slot chart skill palette) and the
// standard's status family. If the palette shifts, update both
// local.css and this file together — local.css is the single
// source of truth for the CSS vars; this file is a type-safe
// mirror for Recharts props.
//
// Tooltip contentStyle + Legend wrapperStyle ARE plain DOM
// inline styles, so those can (and do) use CSS var() directly.

export const CHART_GRID = "#E2E8F0";      // --xz-hairline
export const CHART_AXIS_TEXT = "#64748B"; // --xz-ink-500

export const CHART_TOOLTIP_STYLE = {
  backgroundColor: "var(--xz-surface)",
  border: "1px solid var(--xz-hairline)",
  borderRadius: "var(--xz-r-md)",
  boxShadow: "var(--xz-shadow-md)",
  fontSize: 13,
  color: "var(--xz-ink-700)",
} as const;

export const CHART_TOOLTIP_LABEL_STYLE = {
  color: "var(--xz-ink)",
  fontWeight: 600,
} as const;

export const CHART_LEGEND_STYLE = {
  color: "var(--xz-ink-700)",
  fontSize: 12,
} as const;

// Dashboard's 5-skill series palette. Mirrors --xz-chart-skill-a
// through -e in app/local.css. Deliberately NOT reusing semantic
// status colours for data series — per the standard, chart
// series inside a container may extend beyond the status family.
export const CHART_PALETTE = {
  demand:   "#F87171", // --xz-coral-500
  capacity: "#19B1A1", // --xz-teal
  cnc:      "#3B82F6", // --xz-chart-skill-a
  build:    "#8B5CF6", // --xz-chart-skill-b
  paint:    "#EC4899", // --xz-chart-skill-c
  av:       "#F59E0B", // --xz-chart-skill-d
  packLoad: "#14B8A6", // --xz-chart-skill-e
} as const;

// Single-series brand stroke — used by curves-review's per-curve
// intensity-shape chart. Teal, since the line is a representation
// of the brand-accent curve itself.
export const CHART_BRAND_STROKE = "#19B1A1"; // --xz-teal
