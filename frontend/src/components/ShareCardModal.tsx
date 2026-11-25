import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Copy, Flame, Shield, X } from 'lucide-react';

interface ShareCardModalProps {
  personaName: string;
  sinIndex: number;
  archetype: string;
  penanceTitle: string;
  onClose: () => void;
}

export function ShareCardModal({
  personaName,
  sinIndex,
  archetype,
  penanceTitle,
  onClose,
}: ShareCardModalProps) {
  const [copied, setCopied] = useState(false);

  const shareText = `🔥 ODPUSTEK — Zpověď spálena bez stopy.\nMůj hříšný index: ${sinIndex} % (${archetype})\nZpovědník: ${personaName}\nPokání přiděleno: „${penanceTitle}“\n#Odpustek #Zpovednice`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative max-w-sm w-full"
      >
        <button
          onClick={onClose}
          className="absolute -top-11 right-0 cursor-pointer rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition"
          aria-label="Zavřít"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Aesthetic 9:16-inspired Story Card */}
        <div className="lattice-bg relative overflow-hidden rounded-3xl border border-[#d4af37]/50 bg-gradient-to-b from-[#2f0d19] via-[#13070b] to-[#0a0406] p-7 text-center shadow-2xl">
          <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-52 w-52 rounded-full bg-[#b81d3d]/30 blur-3xl" />

          <div className="relative z-10">
            <p className="text-[10px] uppercase tracking-[0.35em] text-[#d4af37] mb-1">
              Certifikát rozhřešení
            </p>
            <h3 className="font-serif-display text-3xl font-semibold text-[#f8ece4] mb-5">
              ODPUSTEK
            </h3>

            <div className="mx-auto mb-5 flex h-28 w-28 flex-col items-center justify-center rounded-full border-2 border-[#d4af37]/60 bg-[#1c0910]/90 shadow-inner">
              <span className="font-serif-display text-4xl font-bold text-[#f2d57e]">
                {sinIndex}%
              </span>
              <span className="text-[10px] uppercase tracking-widest text-[#c6adb7]">
                Index hříchu
              </span>
            </div>

            <p className="text-xs uppercase tracking-[0.2em] text-[#c78c9c] mb-1">
              Tvůj archetyp
            </p>
            <p className="font-serif-display text-2xl italic text-[#fff4e6] mb-5">
              „{archetype}“
            </p>

            <div className="rounded-xl border border-[#d4af37]/25 bg-black/40 p-3.5 mb-5">
              <p className="text-[10px] uppercase tracking-widest text-[#d4af37]/80 mb-1">
                Pokání přiděleno • {personaName}
              </p>
              <p className="text-sm font-medium text-[#f4e5ec]">{penanceTitle}</p>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#9b858e]">
              <Shield className="h-3.5 w-3.5 text-[#d4af37]" />
              <span>Obsah zpovědi zůstal tajemstvím</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleCopy}
          className="mt-4 w-full cursor-pointer flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#8f1833] to-[#b81d3d] py-3 px-4 text-xs font-semibold uppercase tracking-widest text-white border border-[#f2d57e]/30 hover:brightness-110 transition"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Zkopírováno pro Stories!' : 'Zkopírovat text pro sdílení'}
        </button>
        <p className="mt-2 text-center text-[11px] text-[#96818a] flex items-center justify-center gap-1">
          <Flame className="h-3 w-3 text-[#d4af37]" /> Ideální na screenshot pro Instagram Stories
        </p>
      </motion.div>
    </div>
  );
}
