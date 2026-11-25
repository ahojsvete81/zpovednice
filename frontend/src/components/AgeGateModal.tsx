import { motion } from 'framer-motion';
import { Flame, Lock, ShieldCheck } from 'lucide-react';

interface AgeGateModalProps {
  onAccept: () => void;
}

export function AgeGateModal({ onAccept }: AgeGateModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#060305]/95 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="velvet-card gold-shimmer-border lattice-bg relative max-w-lg w-full rounded-2xl p-8 md:p-10 text-center overflow-hidden"
      >
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-[#9e1c38]/25 blur-3xl candle-glow" />

        <div className="relative z-10">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-[#d4af37]/40 bg-[#2a0c16]/80 text-[#f2d57e] shadow-lg">
            <Flame className="h-7 w-7" />
          </div>

          <p className="text-xs uppercase tracking-[0.28em] text-[#d4af37]/80 mb-2">
            Vstup pouze pro dospělé • 18+
          </p>
          <h1 className="font-serif-display text-4xl md:text-5xl font-semibold tracking-wide text-[#f8ece4] mb-3">
            ODPUSTEK
          </h1>
          <p className="text-sm md:text-base text-[#d2bfc6] leading-relaxed mb-6">
            Smyslná online zpovědnice pro tvé tajné fantazie, vztahová tabu a párovou jiskru.
            Tady stud zůstává za mřížkou — a každé rozhřešení proměníme v hravé{' '}
            <span className="text-[#f2d57e] italic">Pokání</span>.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left mb-7">
            <div className="rounded-xl border border-[#d4af37]/15 bg-[#12080d]/80 p-3.5">
              <div className="flex items-center gap-2 text-[#f2d57e] text-xs font-medium uppercase tracking-wider mb-1">
                <Lock className="h-3.5 w-3.5" />
                Nulová stopa
              </div>
              <p className="text-xs text-[#bba6ae]">
                Text tvé zpovědi neukládáme. Po rituálu spálení zmizí i záznam z databáze.
              </p>
            </div>
            <div className="rounded-xl border border-[#d4af37]/15 bg-[#12080d]/80 p-3.5">
              <div className="flex items-center gap-2 text-[#f2d57e] text-xs font-medium uppercase tracking-wider mb-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                Vkusné 18+ hranice
              </div>
              <p className="text-xs text-[#bba6ae]">
                Zábava a intimní inspirace pro dospělé. Stisknutím <kbd className="px-1 py-0.5 rounded bg-white/10 text-[10px]">Esc</kbd> zapneš diskrétní režim.
              </p>
            </div>
          </div>

          <button
            onClick={onAccept}
            className="w-full cursor-pointer rounded-xl bg-gradient-to-r from-[#7d152d] via-[#9e1c38] to-[#7d152d] px-6 py-3.5 text-sm font-medium uppercase tracking-[0.18em] text-[#fff3df] border border-[#f2d57e]/35 shadow-lg shadow-[#7d152d]/35 hover:brightness-115 active:scale-[0.99] transition"
          >
            Je mi 18+ • Vstoupit do zpovědnice
          </button>

          <p className="mt-4 text-[11px] text-[#8d7680]">
            Vstupem potvrzuješ věk 18+. Aplikace slouží pro zábavu a partnerskou komunikaci, nikoliv jako psychoterapie.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
