"use client";

import { SKILL_PACKS, ALL_SKILL_KEYS, type SkillPackKey } from "@/lib/skillPacks";

interface SkillSelectorProps {
  selected: SkillPackKey[];
  onChange: (skills: SkillPackKey[]) => void;
}

export function SkillSelector({ selected, onChange }: SkillSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {ALL_SKILL_KEYS.map((key) => {
        const pack = SKILL_PACKS[key];
        const active = selected.includes(key);
        return (
          <button
            key={key}
            type="button"
            onClick={() =>
              onChange(
                active ? selected.filter((s) => s !== key) : [...selected, key]
              )
            }
            className={`flex items-center gap-2.5 p-3 rounded-lg border text-left transition-all ${
              active
                ? "border-blue-500/50 bg-blue-500/10"
                : "border-white/10 bg-white/[0.02] hover:border-white/20"
            }`}
          >
            <span className="text-lg">{pack.icon}</span>
            <div className="min-w-0">
              <div className="text-xs font-medium">{pack.name}</div>
              <div className="text-[10px] text-zinc-500 truncate">{pack.description}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
