import { Compass, Eye, HeartHandshake, ShieldCheck, Users } from 'lucide-react';
import type { DesireProfile } from '../types/confession';

interface DesireAtlasProps {
  profile: DesireProfile;
  onStartPool: () => void;
  onStartCouple: () => void;
}

const AXES = [
  { key: 'dominanceAxis', label: 'Vedení', lowLabel: 'Odevzdání', highLabel: 'Vedení' },
  { key: 'tabooAxis', label: 'Tabu', lowLabel: 'Bezpečí', highLabel: 'Zakázané' },
  { key: 'mindBodyAxis', label: 'Mysl & Slova', lowLabel: 'Dotek', highLabel: 'Představy' },
  { key: 'ritualAxis', label: 'Rituál', lowLabel: 'Impulz', highLabel: 'Pomalý rituál' },
  { key: 'intensityAxis', label: 'Temný žár', lowLabel: 'Hravý flirt', highLabel: 'Intenzita' },
  { key: 'opennessAxis', label: 'Otevřenost', lowLabel: 'Skrytý stín', highLabel: 'Bez studu' },
] as const;

export function DesireAtlas({ profile, onStartPool, onStartCouple }: DesireAtlasProps) {
  const cx = 140;
  const cy = 140;
  const maxR = 96;
  const values = AXES.map((a) => profile[a.key] / 100);

  const pointAt = (index: number, ratio: number) => {
    const angle = (Math.PI * 2 * index) / AXES.length - Math.PI / 2;
    return {
      x: cx + Math.cos(angle) * maxR * ratio,
      y: cy + Math.sin(angle) * maxR * ratio,
    };
  };

  const polygonPoints = values
    .map((v, i) => {
      const p = pointAt(i, v);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-[#d4af37]/80 mb-1">
          Psychologická pečeť • Bez ukládání textů a jmen
        </p>
        <h2 className="font-serif-display text-3xl md:text-4xl font-semibold text-[#f8ece4]">
          Atlas tvé touhy
        </h2>
        <p className="text-sm text-[#bfa8b1] mt-1">
          Všechny hry v Tajném Kruhu i Párové zpovědnici po sobě shoří. Zůstává jen tvoje 6-osá mapa
          chemie a vztahové dynamiky.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 velvet-card gold-shimmer-border rounded-3xl p-6 flex flex-col items-center justify-center">
          <div className="flex items-center justify-between w-full mb-2">
            <span className="text-[11px] uppercase tracking-widest text-[#d4af37]">
              Úroveň zasvěcení {profile.initiationLevel} / 5
            </span>
            <span className="text-xs font-semibold text-[#f2d57e]">
              Odhaleno {profile.revealPercent} %
            </span>
          </div>

          <svg viewBox="0 0 280 280" className="w-full max-w-[270px] h-auto my-2">
            {[0.25, 0.5, 0.75, 1].map((ring) => {
              const pts = AXES.map((_, i) => {
                const p = pointAt(i, ring);
                return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
              }).join(' ');
              return (
                <polygon
                  key={ring}
                  points={pts}
                  fill="none"
                  stroke="rgba(212, 175, 55, 0.16)"
                  strokeWidth="1"
                />
              );
            })}

            {AXES.map((axis, i) => {
              const outer = pointAt(i, 1);
              const labelPos = pointAt(i, 1.24);
              return (
                <g key={axis.key}>
                  <line
                    x1={cx}
                    y1={cy}
                    x2={outer.x}
                    y2={outer.y}
                    stroke="rgba(212, 175, 55, 0.18)"
                    strokeWidth="1"
                  />
                  <text
                    x={labelPos.x}
                    y={labelPos.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#e6d3db"
                    fontSize="10"
                    fontWeight="500"
                  >
                    {axis.label}
                  </text>
                </g>
              );
            })}

            <polygon
              points={polygonPoints}
              fill="rgba(184, 29, 61, 0.36)"
              stroke="#f2d57e"
              strokeWidth="2"
            />

            {values.map((v, i) => {
              const p = pointAt(i, v);
              return (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r="4"
                  fill="#f2d57e"
                  stroke="#1a080e"
                  strokeWidth="1.5"
                />
              );
            })}
          </svg>

          <p className="font-serif-display text-2xl italic text-[#fff2dc] text-center mt-1">
            „{profile.primaryArchetype}“
          </p>
          <p className="text-[11px] text-[#9b848e] mt-1 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-[#d4af37]" />
            Uložena pouze anonymní čísla os
          </p>
        </div>

        <div className="lg:col-span-7 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="velvet-card rounded-2xl p-4 text-center">
              <span className="font-serif-display text-3xl font-bold text-[#f2d57e] block">
                {profile.completedCoupleNights}
              </span>
              <span className="text-[11px] text-[#bfa9b2]">Odehraných večerů & srazů</span>
            </div>
            <div className="velvet-card rounded-2xl p-4 text-center">
              <span className="font-serif-display text-3xl font-bold text-[#f2d57e] block">
                Úr. {profile.initiationLevel}
              </span>
              <span className="text-[11px] text-[#bfa9b2]">Úroveň zasvěcení</span>
            </div>
          </div>

          <div className="velvet-card rounded-2xl p-5 space-y-4">
            <div>
              <h3 className="text-xs uppercase tracking-[0.2em] text-[#f2d57e] flex items-center gap-1.5 mb-1.5">
                <Compass className="h-3.5 w-3.5" />
                Tvůj smyslný portrét
              </h3>
              <p className="text-sm text-[#e9d8e0] leading-relaxed">{profile.portraitSummary}</p>
            </div>

            <div className="rounded-xl border border-[#d4af37]/25 bg-[#1b0a12]/90 p-4">
              <h4 className="text-xs uppercase tracking-[0.18em] text-[#e49ab0] flex items-center gap-1.5 mb-1">
                <Eye className="h-3.5 w-3.5" />
                Zrcadlo Zpovědníka
              </h4>
              <p className="text-xs sm:text-sm text-[#dfcbd4] leading-relaxed">
                {profile.blindSpotInsight}
              </p>
            </div>
          </div>

          <div className="velvet-card rounded-2xl p-5 space-y-3">
            {AXES.map((axis) => {
              const val = profile[axis.key];
              return (
                <div key={axis.key} className="space-y-1">
                  <div className="flex justify-between text-[11px] text-[#bda6b0]">
                    <span>{axis.lowLabel}</span>
                    <span className="text-[#f2d57e] font-medium">{val} %</span>
                    <span>{axis.highLabel}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#8f1833] via-[#c43a56] to-[#f2d57e] transition-all duration-700"
                      style={{ width: `${val}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onStartPool}
              className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7d152d] to-[#a31d3c] py-3 px-4 text-xs font-semibold uppercase tracking-wider text-white border border-[#f2d57e]/35"
            >
              <Users className="h-4 w-4 text-[#f2d57e]" />
              Otevřít Tajný Kruh (Skupina)
            </button>
            <button
              type="button"
              onClick={onStartCouple}
              className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl border border-[#d4af37]/35 bg-[#1b0b12] py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#f2d57e]"
            >
              <HeartHandshake className="h-4 w-4" />
              Párová zpovědnice (Pro dva)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
