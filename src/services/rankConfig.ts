// ─────────────────────────────────────────────────────────────────────────────
// Rank Configuration — single source of truth
// Passed from ExamsOverview → AutoAssignModal & BulkAssignModal
// ─────────────────────────────────────────────────────────────────────────────

/** Max periods a rank can be assigned. Unlimited if not set. */
export type RankPeriodLimits = Record<string, number>;

/**
 * Full configuration for a rank:
 *  - name:           display name, e.g. "Associate Professor"
 *  - order:          seniority (higher = more senior). Used for pairing rules.
 *  - canSupervise:   eligible to be assigned as Supervisor
 *  - canAssist:      eligible to be assigned as Assistant
 *  - periodLimit:    max exam periods (0 = unlimited)
 */
export interface RankConfig {
  name: string;
  order: number;
  canSupervise: boolean;
  canAssist: boolean;
  periodLimit: number; // 0 = unlimited
}

/**
 * Derived pairing rule: supervisor rank can be paired with assistant rank.
 * Equal rank allowed only when explicitly flagged.
 */
export interface PairingRule {
  supervisorRank: string;
  assistantRank: string;
}

/** Everything the assignment algorithm needs */
export interface AssignmentRankConfig {
  ranks: RankConfig[];
  /** Derived from ranks — do NOT build manually, use buildPairingRules() */
  pairingRules: PairingRule[];
  /** Convenience map: rank name → period limit (Infinity if unlimited) */
  periodLimits: RankPeriodLimits;
  /** Convenience map: rank name → seniority order */
  rankOrder: Record<string, number>;
}

// ─── Default config (mirrors the old hardcoded values) ───────────────────────

export const DEFAULT_RANKS: RankConfig[] = [
  { name: "Professor",           order: 5, canSupervise: true,  canAssist: false, periodLimit: 6 },  // ← ADD THIS
  { name: "Associate Professor", order: 4, canSupervise: true,  canAssist: true,  periodLimit: 6 },
  { name: "Lecturer",            order: 3, canSupervise: true,  canAssist: true,  periodLimit: 6 },
  { name: "Associate Lecturer",  order: 2, canSupervise: false, canAssist: true,  periodLimit: 6 },
  { name: "Tutor",               order: 1, canSupervise: false, canAssist: true,  periodLimit: 6 },
];

// ─── Builder ─────────────────────────────────────────────────────────────────

/**
 * Build pairing rules from rank configs.
 * A supervisor rank can pair with an assistant rank when:
 *   - supervisor.order >= assistant.order  (senior or equal)
 *   - supervisor.canSupervise && assistant.canAssist
 */
export function buildPairingRules(ranks: RankConfig[]): PairingRule[] {
  const rules: PairingRule[] = [];
  for (const sup of ranks) {
    if (!sup.canSupervise) continue;
    for (const asst of ranks) {
      if (!asst.canAssist) continue;
      if (sup.order >= asst.order) {
        rules.push({ supervisorRank: sup.name, assistantRank: asst.name });
      }
    }
  }
  return rules;
}

export function buildAssignmentConfig(ranks: RankConfig[]): AssignmentRankConfig {
  const pairingRules = buildPairingRules(ranks);

  const periodLimits: RankPeriodLimits = {};
  const rankOrder: Record<string, number> = {};
  for (const r of ranks) {
    if (r.periodLimit > 0) periodLimits[r.name] = r.periodLimit;
    rankOrder[r.name] = r.order;
  }

  return { ranks, pairingRules, periodLimits, rankOrder };
}

export const DEFAULT_ASSIGNMENT_CONFIG = buildAssignmentConfig(DEFAULT_RANKS);

// ─── Storage helpers ──────────────────────────────────────────────────────────

const STORAGE_KEY = "examOverview_rankConfig_v2";

export function loadRankConfig(): RankConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as RankConfig[];
    }
  } catch { /* ignore */ }
  return [...DEFAULT_RANKS];
}

export function saveRankConfig(ranks: RankConfig[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ranks));
  } catch { /* ignore */ }
}
