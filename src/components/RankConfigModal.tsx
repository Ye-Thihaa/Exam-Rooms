import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  X,
  RotateCcw,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Settings2,
  ShieldCheck,
  UserCheck,
  ArrowLeftRight,
  AlertCircle,
} from "lucide-react";
import {
  type RankConfig,
  DEFAULT_RANKS,
  buildPairingRules,
} from "@/services/rankConfig";

interface RankConfigModalProps {
  ranks: RankConfig[];
  onSave: (ranks: RankConfig[]) => void;
  onClose: () => void;
}

const RankConfigModal: React.FC<RankConfigModalProps> = ({
  ranks,
  onSave,
  onClose,
}) => {
  const [draft, setDraft] = useState<RankConfig[]>(() =>
    ranks.map((r) => ({ ...r })),
  );
  const [newName, setNewName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Draft helpers ────────────────────────────────────────────────────────

  const update = (idx: number, patch: Partial<RankConfig>) =>
    setDraft((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    );

  const remove = (idx: number) =>
    setDraft((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      // Recompute order after removal
      return next.map((r, i) => ({ ...r, order: next.length - i }));
    });

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    setDraft((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next.map((r, i) => ({ ...r, order: next.length - i }));
    });
  };

  const moveDown = (idx: number) => {
    if (idx === draft.length - 1) return;
    setDraft((prev) => {
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next.map((r, i) => ({ ...r, order: next.length - i }));
    });
  };

  const addRank = () => {
    setAddError(null);
    const trimmed = newName.trim();
    if (!trimmed) { setAddError("Rank name cannot be empty."); return; }
    if (draft.some((r) => r.name.toLowerCase() === trimmed.toLowerCase())) {
      setAddError(`"${trimmed}" already exists.`); return;
    }
    setDraft((prev) => [
      {
        name: trimmed,
        order: prev.length + 1,
        canSupervise: false,
        canAssist: true,
        periodLimit: 6,
      },
      ...prev.map((r, i) => ({ ...r, order: prev.length - i + 1 })),
    ]);
    setNewName("");
  };

  // ── Validation & Save ────────────────────────────────────────────────────

  const handleSave = () => {
    setSaveError(null);
    if (draft.length === 0) { setSaveError("Add at least one rank."); return; }
    const hasSuper = draft.some((r) => r.canSupervise);
    const hasAsst = draft.some((r) => r.canAssist);
    if (!hasSuper) { setSaveError("At least one rank must be eligible as Supervisor."); return; }
    if (!hasAsst)  { setSaveError("At least one rank must be eligible as Assistant."); return; }
    const invalidLimit = draft.find((r) => r.periodLimit < 0);
    if (invalidLimit) { setSaveError(`Period limit for "${invalidLimit.name}" must be 0 or more.`); return; }
    onSave(draft);
    onClose();
  };

  // ── Preview pairing rules ────────────────────────────────────────────────

  const pairs = buildPairingRules(draft);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white border rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Settings2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Rank Configuration</h2>
              <p className="text-xs text-muted-foreground">
                Set eligible ranks, roles, and period limits for assignment
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* ── Add new rank ── */}
          <div className="px-6 pt-5 pb-4 border-b bg-gray-50/50">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Add Rank
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Senior Lecturer"
                value={newName}
                onChange={(e) => { setNewName(e.target.value); setAddError(null); }}
                onKeyDown={(e) => e.key === "Enter" && addRank()}
                className="flex-1 h-9 text-sm"
              />
              <Button size="sm" className="h-9 gap-1.5" onClick={addRank}>
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </div>
            {addError && (
              <p className="text-xs text-destructive mt-1.5 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />{addError}
              </p>
            )}
          </div>

          {/* ── Rank table ── */}
          <div className="px-6 py-4 space-y-2">
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-x-3 items-center px-3 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Rank (top = most senior)</span>
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground text-center w-16">Supervisor</span>
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground text-center w-16">Assistant</span>
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground text-center w-20">Max Periods</span>
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground text-center w-12">Order</span>
              <span className="w-8" />
            </div>

            {draft.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                No ranks configured. Add one above.
              </p>
            )}

            {draft.map((rank, idx) => (
              <div
                key={rank.name}
                className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-x-3 items-center px-3 py-3 rounded-lg border bg-white hover:bg-gray-50/60 transition-colors"
              >
                {/* Name */}
                <div className="flex items-center gap-2 min-w-0">
                  <div className="shrink-0 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                    {draft.length - idx}
                  </div>
                  <span className="text-sm font-medium text-gray-900 truncate">{rank.name}</span>
                </div>

                {/* Can Supervise */}
                <div className="flex items-center justify-center w-16">
                  <button
                    onClick={() => update(idx, { canSupervise: !rank.canSupervise })}
                    className={`h-7 w-7 rounded-full flex items-center justify-center transition-all ${
                      rank.canSupervise
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                    }`}
                    title={rank.canSupervise ? "Can supervise (click to disable)" : "Cannot supervise (click to enable)"}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Can Assist */}
                <div className="flex items-center justify-center w-16">
                  <button
                    onClick={() => update(idx, { canAssist: !rank.canAssist })}
                    className={`h-7 w-7 rounded-full flex items-center justify-center transition-all ${
                      rank.canAssist
                        ? "bg-purple-500 text-white"
                        : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                    }`}
                    title={rank.canAssist ? "Can assist (click to disable)" : "Cannot assist (click to enable)"}
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Period Limit */}
                <div className="flex items-center gap-1 w-20">
                  <Input
                    type="number"
                    min={0}
                    value={rank.periodLimit}
                    onChange={(e) =>
                      update(idx, { periodLimit: Math.max(0, parseInt(e.target.value) || 0) })
                    }
                    className="h-7 text-xs text-center px-1 w-14"
                  />
                  <span className="text-[9px] text-muted-foreground leading-tight">
                    {rank.periodLimit === 0 ? "∞" : "max"}
                  </span>
                </div>

                {/* Move up/down */}
                <div className="flex flex-col gap-0.5 w-12 items-center">
                  <button
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                    className="h-5 w-5 rounded flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 transition-colors"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => moveDown(idx)}
                    disabled={idx === draft.length - 1}
                    className="h-5 w-5 rounded flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 transition-colors"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Delete */}
                <button
                  onClick={() => remove(idx)}
                  className="h-7 w-7 rounded flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* ── Pairing preview ── */}
          {pairs.length > 0 && (
            <div className="px-6 pb-5">
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ArrowLeftRight className="h-4 w-4 text-indigo-500" />
                  <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide">
                    Generated Pairing Rules ({pairs.length})
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {pairs.map((p, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-white border border-indigo-200 text-indigo-700"
                    >
                      <span className="text-blue-600">{p.supervisorRank}</span>
                      <ArrowLeftRight className="h-2.5 w-2.5 text-indigo-400" />
                      <span className="text-purple-600">{p.assistantRank}</span>
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-indigo-500 mt-2">
                  Pairs are auto-generated: a rank can supervise any rank with equal or lower seniority, as long as both role checkboxes are enabled.
                </p>
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="px-6 pb-5">
            <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-4 w-4 rounded-full bg-blue-500 flex items-center justify-center">
                  <ShieldCheck className="h-2.5 w-2.5 text-white" />
                </span>
                Can be Supervisor
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-4 w-4 rounded-full bg-purple-500 flex items-center justify-center">
                  <UserCheck className="h-2.5 w-2.5 text-white" />
                </span>
                Can be Assistant
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-4 w-4 rounded-full bg-gray-200 flex items-center justify-center">
                  <ShieldCheck className="h-2.5 w-2.5 text-gray-400" />
                </span>
                Role disabled
              </span>
              <span className="flex items-center gap-1.5 ml-2 text-muted-foreground">
                Max Periods: <strong>0 = unlimited</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        {saveError && (
          <div className="mx-6 mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />{saveError}
          </div>
        )}
        <div className="px-6 py-4 border-t shrink-0 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground gap-1.5"
            onClick={() => setDraft(DEFAULT_RANKS.map((r) => ({ ...r })))}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset to defaults
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSave} className="gap-1.5">
              Save Configuration
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RankConfigModal;
