"use client";

import packageJson from "../../package.json";

export default function VersionBadge() {
  return (
    <div className="fixed bottom-3 left-3 z-50">
      <span className="text-[10px] font-mono text-navy/30 bg-white/80 backdrop-blur-sm px-2 py-0.5 rounded border border-navy/5">
        v{packageJson.version}
      </span>
    </div>
  );
}
