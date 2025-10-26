import React from "react";
import { EngineMode } from "../types";

interface EngineStatusProps {
  engineMode: EngineMode;
  localStatus?: { ok: boolean; data?: any; error?: string };
  cloudStatus?: { ok: boolean; data?: any; error?: string };
  localUrl?: string;
  cloudUrl?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
}

const StatusBadge: React.FC<{ ok?: boolean }> = ({ ok }) => {
  const color = ok ? "bg-green-500/20 border-green-400/40 text-green-300" : "bg-yellow-500/10 border-yellow-400/30 text-yellow-200";
  const label = ok ? "Online" : "Unavailable";
  return (
    <span className={`px-2 py-1 rounded-md text-xs border ${color}`}>{label}</span>
  );
};

const Summ: React.FC<{ data?: any }> = ({ data }) => {
  const device = data?.device ?? "unknown";
  const model = data?.model ?? data?.diagnostics?.model_id ?? "unknown";
  const scheduler = data?.optimizations?.scheduler ?? data?.diagnostics?.scheduler ?? "unknown";
  return (
    <div className="text-xs text-gray-400">
      <span className="mr-2">Device: <span className="text-gray-300">{String(device)}</span></span>
      <span className="mr-2">Model: <span className="text-gray-300">{String(model)}</span></span>
      <span>Scheduler: <span className="text-gray-300">{String(scheduler)}</span></span>
    </div>
  );
};

const EngineStatus: React.FC<EngineStatusProps> = ({ engineMode, localStatus, cloudStatus, localUrl, cloudUrl, onRefresh, refreshing }) => {
  const modeLabel =
    engineMode === EngineMode.AUTO ? "Auto (fallback)" :
    engineMode === EngineMode.LOCAL ? "Local" :
    "Cloud";

  return (
    <div className="w-full max-w-2xl mx-auto mb-4">
      <div className="bg-black/20 border border-purple-500/20 rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-300">
            Motor seleccionado: <span className="font-semibold text-purple-300">{modeLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Local</span>
              <StatusBadge ok={localStatus?.ok} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Cloud</span>
              <StatusBadge ok={cloudStatus?.ok} />
            </div>
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="ml-2 text-xs px-2 py-1 rounded-md bg-purple-600/30 hover:bg-purple-600/40 border border-purple-500/30 text-purple-200 disabled:opacity-50"
            >
              {refreshing ? "Checking..." : "Check health"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-400">
          <div className="bg-black/10 rounded-md p-2 border border-purple-500/10">
            <div className="flex items-center justify-between mb-1">
              <div className="font-semibold text-gray-300">Local info</div>
              <div className="text-[10px] text-gray-400">{localUrl || "-"}</div>
            </div>
            <Summ data={localStatus?.data} />
            <pre className="mt-1 whitespace-pre-wrap break-all">{JSON.stringify(localStatus?.data ?? { status: localStatus?.ok ? "ok" : "unavailable" }, null, 2)}</pre>
          </div>
          <div className="bg-black/10 rounded-md p-2 border border-purple-500/10">
            <div className="flex items-center justify-between mb-1">
              <div className="font-semibold text-gray-300">Cloud info</div>
              <div className="text-[10px] text-gray-400">{cloudUrl || "-"}</div>
            </div>
            <Summ data={cloudStatus?.data} />
            <pre className="mt-1 whitespace-pre-wrap break-all">{JSON.stringify(cloudStatus?.data ?? { status: cloudStatus?.ok ? "ok" : "unavailable" }, null, 2)}</pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EngineStatus;