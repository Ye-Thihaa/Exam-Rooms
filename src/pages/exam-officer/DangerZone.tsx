import React, { useState, useRef, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout"; // adjust path
import {
  deleteAllData,
  deleteTableData,
  DeleteResult,
} from "@/services/dangerZoneService";
import {
  AlertTriangle,
  Trash2,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Database,
  Zap,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
} from "lucide-react";

// ─────────────────────────────────────────────
// Passphrase Gate
// ─────────────────────────────────────────────
const REQUIRED_PASSPHRASE = "u!t3x@m0f2!c3r";

interface PassphraseGateProps {
  onUnlock: () => void;
}

const PassphraseGate: React.FC<PassphraseGateProps> = ({ onUnlock }) => {
  const [value, setValue] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [shake, setShake] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value === REQUIRED_PASSPHRASE) {
      onUnlock();
    } else {
      const next = attempts + 1;
      setAttempts(next);
      setError(
        next >= 3
          ? `Incorrect passphrase. ${next} failed attempt${next > 1 ? "s" : ""}.`
          : "Incorrect passphrase. Please try again.",
      );
      setShake(true);
      setValue("");
      setTimeout(() => setShake(false), 600);
      inputRef.current?.focus();
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-[80vh] w-full flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-red-100 blur-xl scale-150 opacity-60" />
              <div className="relative w-20 h-20 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center">
                <Lock className="h-9 w-9 text-red-500" />
              </div>
            </div>
          </div>

          {/* Card */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            {/* Top accent */}
            <div className="h-1 w-full bg-gradient-to-r from-red-400 via-red-600 to-red-400" />

            <div className="px-8 py-8">
              <div className="text-center mb-7">
                <span className="text-[10px] tracking-[0.35em] text-red-500 font-mono uppercase">
                  RESTRICTED ACCESS
                </span>
                <h2 className="text-2xl font-black text-gray-900 mt-1 tracking-tight">
                  Danger Zone
                </h2>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                  This area contains irreversible operations. Enter the admin
                  passphrase to continue.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2 tracking-wide uppercase">
                    Admin Passphrase
                  </label>
                  <div
                    style={
                      shake
                        ? {
                            animation:
                              "shake 0.5s cubic-bezier(.36,.07,.19,.97) both",
                          }
                        : {}
                    }
                  >
                    <div className="relative">
                      <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        ref={inputRef}
                        type={showPass ? "text" : "password"}
                        value={value}
                        onChange={(e) => {
                          setValue(e.target.value);
                          if (error) setError("");
                        }}
                        placeholder="Enter passphrase…"
                        className={`w-full pl-10 pr-11 py-3 text-sm border rounded-lg font-mono
                          bg-gray-50 focus:bg-white outline-none transition-all
                          ${
                            error
                              ? "border-red-400 focus:border-red-500 ring-2 ring-red-100"
                              : "border-gray-200 focus:border-red-400 focus:ring-2 focus:ring-red-50"
                          }`}
                        autoComplete="off"
                        spellCheck={false}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        tabIndex={-1}
                      >
                        {showPass ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Error message */}
                  {error && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                      <p className="text-xs text-red-600">{error}</p>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!value.trim()}
                  className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 disabled:opacity-40
                    text-white font-bold text-sm rounded-lg transition-all
                    flex items-center justify-center gap-2 tracking-wide
                    shadow-sm hover:shadow-md active:scale-[0.98]"
                >
                  <ShieldAlert className="h-4 w-4" />
                  Unlock Danger Zone
                </button>
              </form>
            </div>

            {/* Footer warning */}
            <div className="px-8 py-4 bg-amber-50 border-t border-amber-100 flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-700 leading-relaxed">
                All operations in this area are{" "}
                <strong>permanent and irreversible</strong>. Ensure you have a
                backup before proceeding.
              </p>
            </div>
          </div>

          {attempts > 0 && (
            <p className="text-center text-xs text-gray-400 mt-4">
              {attempts} failed attempt{attempts > 1 ? "s" : ""} this session
            </p>
          )}
        </div>

        {/* Shake keyframes */}
        <style>{`
          @keyframes shake {
            10%, 90% { transform: translateX(-2px); }
            20%, 80% { transform: translateX(4px); }
            30%, 50%, 70% { transform: translateX(-6px); }
            40%, 60% { transform: translateX(6px); }
          }
        `}</style>
      </div>
    </DashboardLayout>
  );
};

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface TableInfo {
  table: string;
  label: string;
  description: string;
}

const TABLES: TableInfo[] = [
  {
    table: "seating_assignment",
    label: "Seating Assignments",
    description: "All student seat allocations for every exam room.",
  },
  {
    table: "teacher_assignment",
    label: "Teacher Assignments",
    description: "All supervisor and assistant assignments to exam rooms.",
  },
  {
    table: "exam_room",
    label: "Exam Rooms",
    description: "All exam room records and their configurations.",
  },
  {
    table: "exam",
    label: "Exams",
    description: "All exam schedules, subjects, and session records.",
  },
  {
    table: "student",
    label: "Students",
    description: "All student profiles, year levels, and programmes.",
  },
  {
    table: "teacher",
    label: "Teachers",
    description: "All teacher profiles, ranks, and department info.",
  },
  {
    table: "room",
    label: "Rooms",
    description: "All room definitions, capacities, and layouts.",
  },
];

// ─────────────────────────────────────────────
// Confirmation Modal
// ─────────────────────────────────────────────
interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  isLoading,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
    <div className="w-full max-w-lg mx-4 overflow-hidden rounded-none border border-red-200 shadow-2xl bg-white">
      {/* Scanline top accent */}
      <div className="h-1 w-full bg-gradient-to-r from-transparent via-red-600 to-transparent" />

      {/* Header */}
      <div className="px-8 py-5 border-b border-gray-100 flex items-center gap-4">
        <div className="w-10 h-10 flex items-center justify-center border border-red-200 rounded-sm bg-red-50 shrink-0">
          <ShieldAlert className="h-5 w-5 text-red-500" />
        </div>
        <div>
          <span className="text-[10px] tracking-[0.3em] text-red-500 font-mono uppercase block mb-0.5">
            CRITICAL ACTION
          </span>
          <h2 className="text-base font-bold text-gray-900 tracking-tight">
            {title}
          </h2>
        </div>
      </div>

      {/* Body */}
      <div className="px-8 py-6 space-y-4">
        <div className="border-l-2 border-red-600 pl-4 py-1">
          <p className="text-sm text-red-700 leading-relaxed">{message}</p>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">
          This action is{" "}
          <span className="text-gray-800 font-semibold">permanent</span> and
          cannot be undone. There is no recovery after deletion. No backup will
          be created automatically.
        </p>
      </div>

      {/* Footer */}
      <div className="px-8 pb-7 flex gap-3 justify-end border-t border-gray-100 pt-5">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="px-5 py-2 text-sm font-medium text-gray-600 border border-gray-300 hover:border-gray-400 hover:text-gray-800 disabled:opacity-40 transition-all rounded-sm tracking-wide"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className="px-5 py-2 text-sm font-bold text-white bg-red-700 hover:bg-red-600 disabled:opacity-40 transition-all rounded-sm tracking-wide flex items-center gap-2 shadow-[0_0_20px_rgba(220,38,38,0.3)]"
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
              <span>Deleting…</span>
            </>
          ) : (
            <>
              <Trash2 className="h-4 w-4" />
              <span>{confirmLabel}</span>
            </>
          )}
        </button>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────
// Result Banner
// ─────────────────────────────────────────────
interface ResultBannerProps {
  result: DeleteResult;
  onDismiss: () => void;
}

const ResultBanner: React.FC<ResultBannerProps> = ({ result, onDismiss }) => (
  <div
    className={`w-full border-l-4 px-6 py-4 flex items-start gap-4 rounded-sm ${
      result.success
        ? "bg-emerald-50 border-emerald-500 text-emerald-800"
        : "bg-red-50 border-red-500 text-red-800"
    }`}
  >
    {result.success ? (
      <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-emerald-600" />
    ) : (
      <XCircle className="h-5 w-5 shrink-0 mt-0.5 text-red-600" />
    )}
    <div className="flex-1 min-w-0">
      <p className="font-semibold text-sm">{result.message}</p>
      {result.deletedCounts && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {Object.entries(result.deletedCounts).map(([tbl, cnt]) => (
            <span key={tbl} className="text-xs font-mono opacity-75">
              {tbl}:{" "}
              <span className="font-bold">
                {cnt} row{cnt !== 1 ? "s" : ""}
              </span>
            </span>
          ))}
        </div>
      )}
      {result.error && (
        <p className="mt-1 text-xs opacity-60 font-mono">{result.error}</p>
      )}
    </div>
    <button
      onClick={onDismiss}
      className="text-current opacity-40 hover:opacity-100 transition-opacity shrink-0"
    >
      <XCircle className="h-4 w-4" />
    </button>
  </div>
);

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
const DangerZone: React.FC = () => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    { type: "all" } | { type: "table"; table: string; label: string } | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<DeleteResult | null>(null);
  const [expandedInfo, setExpandedInfo] = useState(false);

  // Show passphrase gate if not yet unlocked
  if (!isUnlocked) {
    return <PassphraseGate onUnlock={() => setIsUnlocked(true)} />;
  }

  const handleConfirm = async () => {
    if (!pendingAction) return;
    setIsLoading(true);

    let result: DeleteResult;
    if (pendingAction.type === "all") {
      result = await deleteAllData();
    } else {
      result = await deleteTableData(pendingAction.table);
    }

    setIsLoading(false);
    setPendingAction(null);
    setLastResult(result);
  };

  const confirmMessage =
    pendingAction?.type === "all"
      ? "You are about to permanently delete ALL records across every table in the database."
      : `You are about to permanently delete all records from the "${
          (pendingAction as { label: string })?.label
        }" table.`;

  return (
    <DashboardLayout>
      {/* Full-width light wrapper */}
      <div className="min-h-screen w-full bg-white">
        <div className="w-full px-6 md:px-10 py-8 space-y-6">
          {/* ── Page Header ── */}
          <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-gray-200">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="absolute inset-0 rounded-sm bg-red-600/20 blur-lg" />
                <div className="relative w-14 h-14 flex items-center justify-center border border-red-700/50 rounded-sm bg-red-950/50">
                  <ShieldAlert className="h-7 w-7 text-red-500" />
                </div>
              </div>
              <div>
                <span className="text-[10px] tracking-[0.35em] text-red-500 font-mono uppercase">
                  ADMIN — RESTRICTED ACCESS
                </span>
                <h1
                  className="text-3xl font-black text-gray-900 tracking-tight mt-0.5"
                  style={{
                    fontFamily: "'Georgia', serif",
                    letterSpacing: "-0.02em",
                  }}
                >
                  Danger Zone
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Irreversible database operations — proceed with extreme
                  caution.
                </p>
              </div>
            </div>

            {/* Status pill */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-50" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600" />
              </span>
              <span className="text-xs font-mono text-red-400 tracking-widest uppercase">
                Live DB
              </span>
            </div>
          </div>

          {/* ── Result banner ── */}
          {lastResult && (
            <ResultBanner
              result={lastResult}
              onDismiss={() => setLastResult(null)}
            />
          )}

          {/* ── Info accordion ── */}
          <div className="w-full border border-amber-300 rounded-xl overflow-hidden bg-amber-50">
            <button
              onClick={() => setExpandedInfo(!expandedInfo)}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-amber-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="font-semibold text-amber-800 text-sm">
                  What does this page do?
                </span>
              </div>
              {expandedInfo ? (
                <ChevronUp className="h-4 w-4 text-amber-600" />
              ) : (
                <ChevronDown className="h-4 w-4 text-amber-600" />
              )}
            </button>
            {expandedInfo && (
              <div className="px-6 pb-5 text-sm text-amber-900 space-y-3 border-t border-amber-200 pt-4 leading-relaxed">
                <p>
                  This page provides administrative controls to{" "}
                  <strong className="text-amber-950">
                    permanently delete all records
                  </strong>{" "}
                  from the ExamRoom database. Intended for end-of-academic-year
                  resets, test data cleanup, or full system re-initialisation.
                </p>
                <p>
                  You can delete{" "}
                  <strong className="text-amber-950">
                    the entire database at once
                  </strong>
                  , or target a{" "}
                  <strong className="text-amber-950">specific table</strong>{" "}
                  individually. Deletion respects foreign-key order: child
                  records are removed before their parent records.
                </p>
                <p className="font-semibold text-amber-800">
                  ⚠ There is no undo, no recycle bin, and no automatic backup.
                  Export your data before proceeding.
                </p>
              </div>
            )}
          </div>

          {/* ── Nuclear option ── Full Width ── */}
          <div
            className="w-full rounded-sm border border-red-200 overflow-hidden relative"
            style={{
              background: "linear-gradient(135deg, #fff5f5 0%, #ffffff 60%)",
            }}
          >
            {/* Subtle grid texture overlay */}
            <div
              className="absolute inset-0 opacity-5 pointer-events-none"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, transparent, transparent 24px, rgba(255,255,255,0.3) 24px, rgba(255,255,255,0.3) 25px), repeating-linear-gradient(90deg, transparent, transparent 24px, rgba(255,255,255,0.3) 24px, rgba(255,255,255,0.3) 25px)",
              }}
            />
            <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 px-8 py-7">
              <div className="flex items-start gap-5">
                <div className="w-12 h-12 flex items-center justify-center border border-red-200 rounded-sm bg-red-50 shrink-0">
                  <Database className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] tracking-[0.3em] text-red-500 font-mono uppercase">
                      NUCLEAR OPTION
                    </span>
                    <span className="px-1.5 py-0.5 text-[9px] font-bold tracking-widest bg-red-100 text-red-600 rounded-sm border border-red-200 uppercase">
                      Irreversible
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">
                    Delete Entire Database
                  </h2>
                  <p className="text-sm text-gray-600 mt-1.5 max-w-lg leading-relaxed">
                    Permanently removes{" "}
                    <span className="text-gray-900 font-medium">
                      every record from all tables
                    </span>
                    : seating assignments, teacher assignments, exam rooms,
                    exams, students, teachers, and rooms. Schema is preserved —
                    only data is deleted.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setPendingAction({ type: "all" })}
                className="shrink-0 inline-flex items-center gap-2.5 px-7 py-3 rounded-sm
                  bg-red-700 hover:bg-red-600 text-white font-bold text-sm
                  transition-all shadow-[0_0_30px_rgba(220,38,38,0.25)]
                  hover:shadow-[0_0_40px_rgba(220,38,38,0.4)]
                  tracking-wide border border-red-600/50 whitespace-nowrap
                  active:scale-95"
              >
                <Zap className="h-4 w-4" />
                Delete All Data
              </button>
            </div>
          </div>

          {/* ── Per-table section ── Full Width ── */}
          <div
            className="w-full rounded-sm border border-gray-200 overflow-hidden shadow-sm"
            style={{ background: "#ffffff" }}
          >
            {/* Section header */}
            <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] tracking-[0.3em] text-gray-400 font-mono uppercase block mb-0.5">
                  GRANULAR CONTROL
                </span>
                <h2 className="font-bold text-gray-900 text-lg tracking-tight">
                  Delete by Table
                </h2>
              </div>
              <p className="text-xs text-gray-400 max-w-xs text-right hidden sm:block leading-relaxed">
                Foreign-key dependencies handled automatically. Delete child
                tables before parents if needed.
              </p>
            </div>

            {/* Table rows */}
            <div className="divide-y divide-gray-100">
              {TABLES.map(({ table, label, description }, index) => (
                <div
                  key={table}
                  className="group px-8 py-5 flex items-center justify-between gap-6
                    hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-5 min-w-0">
                    {/* Index number */}
                    <span
                      className="text-xs font-mono text-gray-300 w-5 shrink-0 select-none"
                      aria-hidden
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 transition-colors">
                        {label}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {description}
                      </p>
                      <code className="text-[11px] text-gray-400 font-mono mt-1 inline-block group-hover:text-gray-500 transition-colors">
                        {table}
                      </code>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      setPendingAction({ type: "table", table, label })
                    }
                    className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-sm
                      border border-gray-200 bg-transparent text-gray-500 text-xs font-semibold
                      hover:border-red-600 hover:bg-red-600 hover:text-white
                      transition-all tracking-wide active:scale-95"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              ))}
            </div>

            {/* Footer note */}
            <div className="px-8 py-4 border-t border-gray-100 flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              <p className="text-[11px] text-gray-400">
                {TABLES.length} tables listed. All deletions are permanent and
                take effect immediately.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Confirmation modal ── */}
      {pendingAction && (
        <ConfirmModal
          title={
            pendingAction.type === "all"
              ? "Delete Entire Database?"
              : `Delete "${(pendingAction as { label: string }).label}"?`
          }
          message={confirmMessage}
          confirmLabel={
            pendingAction.type === "all"
              ? "Yes, Delete Everything"
              : "Yes, Delete Table"
          }
          onConfirm={handleConfirm}
          onCancel={() => setPendingAction(null)}
          isLoading={isLoading}
        />
      )}
    </DashboardLayout>
  );
};

export default DangerZone;
