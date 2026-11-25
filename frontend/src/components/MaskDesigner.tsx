import { Dices, Sparkles } from 'lucide-react';
import type { MaskShape, MaskStyle } from '../types/confession';
import { MaskAvatar } from './MaskAvatar';

interface MaskDesignerProps {
  maskName: string;
  maskSymbol: string;
  maskStyle: MaskStyle;
  onChangeName: (name: string) => void;
  onChangeSymbol: (symbol: string) => void;
  onChangeStyle: (style: MaskStyle) => void;
}

const SHAPES: { id: MaskShape; label: string }[] = [
  { id: 'venetian', label: 'Benátská' },
  { id: 'cat', label: 'Kočičí' },
  { id: 'phantom', label: 'Fantom' },
  { id: 'crown', label: 'Koruna' },
  { id: 'butterfly', label: 'Fénix' },
];

const COLORS = [
  { hex: '#8f1833', name: 'Karmín' },
  { hex: '#1e1526', name: 'Obsidián' },
  { hex: '#b58425', name: 'Zlatý brokát' },
  { hex: '#1b3664', name: 'Půlnoční safír' },
  { hex: '#155942', name: 'Smaragd' },
  { hex: '#5a1d5e', name: 'Švestkový samet' },
];

const ACCENTS = [
  { hex: '#f2d57e', name: 'Zlatá' },
  { hex: '#dce1ec', name: 'Stříbrná' },
  { hex: '#ff5474', name: 'Rudý žár' },
  { hex: '#d98d62', name: 'Bronz' },
];

const SYMBOLS = ['🜂', '⚜', '☾', '✦', '♛', '🔥', '🦊', '🐍'];

const RANDOM_NAMES = [
  'Rudý Fénix',
  'Sametová Liška',
  'Černý Havran',
  'Obsidiánový Král',
  'Šarlatová Dáma',
  'Zlatý Had',
  'Půlnoční Stín',
  'Karmínová Kočka',
  'Jantarová Siréna',
  'Stříbrný Vlk',
];

export function MaskDesigner({
  maskName,
  maskSymbol,
  maskStyle,
  onChangeName,
  onChangeSymbol,
  onChangeStyle,
}: MaskDesignerProps) {
  const handleRandomize = () => {
    const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
    onChangeName(pick(RANDOM_NAMES));
    onChangeSymbol(pick(SYMBOLS));
    onChangeStyle({
      shape: pick(SHAPES).id,
      color: pick(COLORS).hex,
      accent: pick(ACCENTS).hex,
    });
  };

  return (
    <div className="rounded-2xl border border-[#d4af37]/30 bg-[#12070c]/85 p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f2d57e]">
          <Sparkles className="h-3.5 w-3.5" />
          Návrhář tvé vlastní masky
        </span>
        <button
          type="button"
          onClick={handleRandomize}
          className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-[#d4af37]/35 bg-[#250d17] px-2.5 py-1.5 text-[11px] font-medium text-[#f2d57e] hover:bg-[#381322] transition"
        >
          <Dices className="h-3.5 w-3.5" />
          Náhodná
        </button>
      </div>

      {/* Live Preview Stage */}
      <div className="relative flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-b from-[#230b15]/90 to-[#0b0407] py-4 px-3 overflow-hidden">
        <div
          className="pointer-events-none absolute h-28 w-44 rounded-full blur-2xl opacity-35"
          style={{ backgroundColor: maskStyle.color }}
        />
        <MaskAvatar style={maskStyle} symbol={maskSymbol} size="lg" className="relative z-10" />
        <p className="relative z-10 font-serif-display text-2xl font-semibold text-[#fff3e2] mt-1">
          {maskName.trim() || 'Tvá tajná maska'}
        </p>
      </div>

      {/* Mask Name */}
      <div>
        <label className="block text-[11px] uppercase tracking-wider text-[#b7a0aa] mb-1.5">
          Název tvé masky (nikdy nepiš své pravé jméno!)
        </label>
        <input
          type="text"
          maxLength={36}
          value={maskName}
          onChange={(e) => onChangeName(e.target.value)}
          placeholder="Např. Sametová Liška, Noční Fantom…"
          className="w-full rounded-xl border border-[#d4af37]/30 bg-black/55 px-3.5 py-2.5 text-sm text-[#fff3e4] placeholder-[#78616b] focus:border-[#d4af37] focus:outline-none"
        />
      </div>

      {/* Shape selector */}
      <div>
        <p className="text-[11px] uppercase tracking-wider text-[#b7a0aa] mb-1.5">Tvar masky</p>
        <div className="grid grid-cols-5 gap-1.5">
          {SHAPES.map((sh) => {
            const active = maskStyle.shape === sh.id;
            return (
              <button
                key={sh.id}
                type="button"
                onClick={() => onChangeStyle({ ...maskStyle, shape: sh.id })}
                className={`cursor-pointer rounded-xl py-2 px-1 text-[11px] font-medium border transition text-center ${
                  active
                    ? 'bg-[#8f1833] border-[#f2d57e] text-white'
                    : 'bg-black/40 border-white/10 text-[#c4aeb7] hover:border-[#d4af37]/40'
                }`}
              >
                {sh.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Colors & Accents */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-[#b7a0aa] mb-1.5">Barva sametu</p>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => {
              const active = maskStyle.color.toLowerCase() === c.hex.toLowerCase();
              return (
                <button
                  key={c.hex}
                  type="button"
                  title={c.name}
                  onClick={() => onChangeStyle({ ...maskStyle, color: c.hex })}
                  className={`cursor-pointer h-8 w-8 rounded-full border-2 transition ${
                    active ? 'border-[#f2d57e] scale-110 ring-2 ring-[#f2d57e]/40' : 'border-white/25'
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-wider text-[#b7a0aa] mb-1.5">Zdobení / okraj</p>
          <div className="flex flex-wrap gap-2">
            {ACCENTS.map((a) => {
              const active = maskStyle.accent.toLowerCase() === a.hex.toLowerCase();
              return (
                <button
                  key={a.hex}
                  type="button"
                  title={a.name}
                  onClick={() => onChangeStyle({ ...maskStyle, accent: a.hex })}
                  className={`cursor-pointer h-8 w-8 rounded-full border-2 transition ${
                    active ? 'border-white scale-110 ring-2 ring-white/40' : 'border-white/25'
                  }`}
                  style={{ backgroundColor: a.hex }}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Center Emblem Symbol */}
      <div>
        <p className="text-[11px] uppercase tracking-wider text-[#b7a0aa] mb-1.5">Znak na čele masky</p>
        <div className="grid grid-cols-8 gap-1.5">
          {SYMBOLS.map((sym) => {
            const active = maskSymbol === sym;
            return (
              <button
                key={sym}
                type="button"
                onClick={() => onChangeSymbol(sym)}
                className={`cursor-pointer h-9 rounded-xl border text-base flex items-center justify-center transition ${
                  active
                    ? 'bg-[#3b1222] border-[#f2d57e] text-[#f2d57e]'
                    : 'bg-black/40 border-white/10 text-[#d6c2ca] hover:border-[#d4af37]/40'
                }`}
              >
                {sym}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
