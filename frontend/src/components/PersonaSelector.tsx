import { Crown, Sparkles } from 'lucide-react';
import type { Persona } from '../types/confession';

interface PersonaSelectorProps {
  personas: Persona[];
  selectedId: string;
  isVip: boolean;
  onSelect: (id: string) => void;
}

export function PersonaSelector({ personas, selectedId, isVip, onSelect }: PersonaSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {personas.map((persona) => {
        const isSelected = persona.id === selectedId;
        const freeForUser = !persona.isPremium || isVip;

        return (
          <button
            key={persona.id}
            type="button"
            onClick={() => onSelect(persona.id)}
            className={`group relative text-left rounded-2xl p-4 transition-all duration-300 cursor-pointer border ${
              isSelected
                ? 'bg-gradient-to-b from-[#2f111c]/95 to-[#16090e]/95 border-[#d4af37]/70 shadow-lg shadow-[#9e1c38]/25 -translate-y-0.5'
                : 'bg-[#140a0f]/75 border-[#d4af37]/15 hover:border-[#d4af37]/40 hover:bg-[#1e0e15]/85'
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-2.5">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl text-lg font-serif-display border border-white/10 shadow-inner"
                style={{
                  backgroundColor: `${persona.accentColor}22`,
                  color: persona.accentColor,
                }}
              >
                {persona.avatarSymbol}
              </div>

              {freeForUser ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/70 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
                  <Sparkles className="h-3 w-3" />
                  {isVip && persona.isPremium ? 'VIP Zdarma' : 'Zdarma'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#3b1b0e]/80 border border-[#d4af37]/40 px-2.5 py-0.5 text-[11px] font-medium text-[#f2d57e]">
                  <Crown className="h-3 w-3" />
                  {persona.odpustkyCost} Odpustek
                </span>
              )}
            </div>

            <h3 className="font-serif-display text-xl font-semibold text-[#f8ece4] leading-tight">
              {persona.name}
            </h3>
            <p className="text-xs font-medium uppercase tracking-wider text-[#d4af37]/80 mb-2">
              {persona.title}
            </p>
            <p className="text-xs text-[#cbb5be] leading-relaxed line-clamp-2 mb-2.5">
              {persona.tagline}
            </p>
            <p className="text-[10px] tracking-wide text-[#917b84] border-t border-white/5 pt-2">
              {persona.style}
            </p>
          </button>
        );
      })}
    </div>
  );
}
