import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Copy, Download, Flame, MessageCircle, ShieldCheck, Sparkles, X } from 'lucide-react';
import type { GroupPoolState } from '../types/confession';

interface NightSummaryModalProps {
  pool: GroupPoolState;
  inviteUrl: string;
  onClose: () => void;
  onNotify: (msg: string) => void;
}

export function NightSummaryModal({
  pool,
  inviteUrl,
  onClose,
  onNotify,
}: NightSummaryModalProps) {
  const [copied, setCopied] = useState(false);

  const totalChambers =
    pool.activeChambersCount + pool.completedRendezvousCount + pool.burnedChambersCount;

  const summaryText = `🔥 BILANCE NOCI — ${pool.title} (${pool.poolCode})\n🎭 Masek v místnosti: ${pool.memberCount}\n✨ Hořících jisker: ${pool.totalSparksCount}\n🕯️ Otevřených tajných komnat: ${totalChambers}\n💨 Spálených masek (někdo utekl v kouři!): ${pool.burnedChambersCount}\n🔥 Tajných srazů po půlnoci: ${pool.completedRendezvousCount}\n\nKdo to byl, ví jen oni… Zahrajte si na další párty:\n${window.location.origin}`;

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(summaryText)}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(summaryText);
    setCopied(true);
    onNotify('Bilance noci zkopírována!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Generates a crisp 9:16 Instagram Story PNG card right in the browser!
  const handleDownloadStoryPng = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bg = ctx.createLinearGradient(0, 0, 1080, 1920);
    bg.addColorStop(0, '#360d1c');
    bg.addColorStop(0.45, '#12060b');
    bg.addColorStop(1, '#220b12');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1080, 1920);

    // Subtle candle glow
    const glow = ctx.createRadialGradient(540, 380, 40, 540, 380, 460);
    glow.addColorStop(0, 'rgba(184, 29, 61, 0.45)');
    glow.addColorStop(1, 'rgba(184, 29, 61, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 1080, 900);

    // Gold ornamental border
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 5;
    ctx.strokeRect(64, 64, 952, 1792);
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(86, 86, 908, 1748);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#d4af37';
    ctx.font = '600 28px Inter, sans-serif';
    ctx.fillText('TAJNÝ KRUH • ANONYMNÍ BILANCE NOCI', 540, 210);

    ctx.fillStyle = '#fff3e2';
    ctx.font = '700 94px Georgia, serif';
    ctx.fillText('ODPUSTEK', 540, 320);

    ctx.fillStyle = '#e7cfd8';
    ctx.font = 'italic 46px Georgia, serif';
    ctx.fillText(`„${pool.title}“`, 540, 405);

    const rows = [
      { label: 'Masek v místnosti', value: String(pool.memberCount), color: '#fff3e2' },
      { label: 'Hořících jisker v poolu', value: String(pool.totalSparksCount), color: '#f2d57e' },
      { label: 'Otevřených tajných komnat', value: String(totalChambers), color: '#ff8ea1' },
      { label: 'Spálených masek (únik v kouři)', value: String(pool.burnedChambersCount), color: '#d6c2ca' },
      { label: 'Tajných srazů po půlnoci', value: String(pool.completedRendezvousCount), color: '#6ee7a0' },
    ];

    let y = 550;
    for (const row of rows) {
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(140, y - 62, 800, 138);
      ctx.strokeStyle = 'rgba(212,175,55,0.28)';
      ctx.lineWidth = 2;
      ctx.strokeRect(140, y - 62, 800, 138);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#d8c3cc';
      ctx.font = '500 32px Inter, sans-serif';
      ctx.fillText(row.label, 185, y + 18);

      ctx.textAlign = 'right';
      ctx.fillStyle = row.color;
      ctx.font = '700 62px Georgia, serif';
      ctx.fillText(row.value, 895, y + 26);

      y += 172;
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#f2d57e';
    ctx.font = 'italic 40px Georgia, serif';
    ctx.fillText('„Kdo to byl, ví jen oni…“', 540, 1520);

    ctx.fillStyle = '#b79fa9';
    ctx.font = '400 28px Inter, sans-serif';
    ctx.fillText('Žádná jména • Žádné důkazy • Ráno vše shoří', 540, 1605);

    ctx.fillStyle = '#d4af37';
    ctx.font = '600 30px monospace';
    ctx.fillText(inviteUrl.replace(/^https?:\/\//, '').split('/?')[0], 540, 1730);

    const a = document.createElement('a');
    a.download = `odpustek-bilance-${pool.poolCode.toLowerCase()}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
    onNotify('Karta Bilance noci (Stories PNG) uložena!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/88 backdrop-blur-md p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative max-w-sm w-full my-6"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-11 right-0 cursor-pointer rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          aria-label="Zavřít"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Preview Card */}
        <div className="lattice-bg relative overflow-hidden rounded-3xl border border-[#d4af37]/60 bg-gradient-to-b from-[#330d1b] via-[#13070b] to-[#0a0406] p-6 text-center shadow-2xl space-y-5">
          <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-48 w-48 rounded-full bg-[#b81d3d]/35 blur-3xl" />

          <div className="relative z-10 space-y-1">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#d4af37] flex items-center justify-center gap-1">
              <Sparkles className="h-3 w-3" />
              Anonymní Bilance noci
            </p>
            <h3 className="font-serif-display text-3xl font-semibold text-[#fff3e2]">
              {pool.title}
            </h3>
            <p className="font-mono text-xs tracking-widest text-[#bfa5af]">{pool.poolCode}</p>
          </div>

          <div className="relative z-10 space-y-2 text-left">
            {[
              ['Masek v místnosti', pool.memberCount, 'text-[#fff3e2]'],
              ['Hořících jisker', pool.totalSparksCount, 'text-[#f2d57e]'],
              ['Otevřených tajných komnat', totalChambers, 'text-[#ff8ea1]'],
              ['Spálených masek (útěk v kouři)', pool.burnedChambersCount, 'text-[#d6c2ca]'],
              ['Tajných srazů po půlnoci', pool.completedRendezvousCount, 'text-emerald-300'],
            ].map(([label, val, color]) => (
              <div
                key={String(label)}
                className="flex items-center justify-between rounded-xl border border-[#d4af37]/20 bg-black/40 px-4 py-2.5"
              >
                <span className="text-xs text-[#d6c2ca]">{label}</span>
                <span className={`font-serif-display text-2xl font-bold ${color}`}>{val}</span>
              </div>
            ))}
          </div>

          <p className="relative z-10 font-serif-display text-lg italic text-[#f2d57e]">
            „Kdo to byl, ví jen oni…“
          </p>

          <p className="relative z-10 text-[10px] text-[#9b858e] flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-[#d4af37]" />
            Nulové prozrazení identit • Ideální do ranního chatu
          </p>
        </div>

        {/* Share buttons */}
        <div className="mt-3.5 space-y-2">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#062411] hover:brightness-105"
          >
            <MessageCircle className="h-4 w-4 fill-current" />
            Poslat Bilanci na WhatsApp
          </a>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleDownloadStoryPng}
              className="cursor-pointer min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#8c1832] to-[#b51f3e] px-3 py-2.5 text-xs font-semibold text-white border border-[#f2d57e]/40"
            >
              <Download className="h-3.5 w-3.5" />
              Stories (PNG)
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="cursor-pointer min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-black/50 px-3 py-2.5 text-xs font-medium text-[#e6d5dc]"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Zkopírováno' : 'Kopírovat'}
            </button>
          </div>
          <p className="text-center text-[11px] text-[#96818a] flex items-center justify-center gap-1 pt-0.5">
            <Flame className="h-3 w-3 text-[#d4af37]" /> Sdílej po párty — ať další parta závidí
          </p>
        </div>
      </motion.div>
    </div>
  );
}
