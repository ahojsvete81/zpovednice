import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import QRCode from 'qrcode';
import { Copy, Download, QrCode, X } from 'lucide-react';

interface QrInviteModalProps {
  poolCode: string;
  poolTitle: string;
  inviteUrl: string;
  onClose: () => void;
  onNotify: (msg: string) => void;
}

export function QrInviteModal({
  poolCode,
  poolTitle,
  inviteUrl,
  onClose,
  onNotify,
}: QrInviteModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    QRCode.toDataURL(inviteUrl, {
      width: 520,
      margin: 2,
      color: {
        dark: '#14060b',
        light: '#fdf5e6',
      },
      errorCorrectionLevel: 'M',
    })
      .then(setQrDataUrl)
      .catch(() => {});
  }, [inviteUrl]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    onNotify('Odkaz zkopírován!');
  };

  // Generates a gorgeous printable Dark Baroque table card PNG (for cabins, parties & bars!)
  const handleDownloadTableCard = async () => {
    if (!qrDataUrl) return;
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 1200;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background velvet gradient
    const bg = ctx.createLinearGradient(0, 0, 900, 1200);
    bg.addColorStop(0, '#2a0b16');
    bg.addColorStop(0.5, '#11060a');
    bg.addColorStop(1, '#1d0910');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 900, 1200);

    // Gold border frame
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 4;
    ctx.strokeRect(40, 40, 820, 1120);
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(56, 56, 788, 1088);

    // Header text
    ctx.textAlign = 'center';
    ctx.fillStyle = '#d4af37';
    ctx.font = '600 22px Inter, sans-serif';
    ctx.fillText('TAJNÝ KRUH • POUZE PRO DOSPĚLÉ 18+', 450, 125);

    ctx.fillStyle = '#fff3e2';
    ctx.font = '700 66px Georgia, serif';
    ctx.fillText('ODPUSTEK', 450, 200);

    ctx.fillStyle = '#e7cfd8';
    ctx.font = 'italic 34px Georgia, serif';
    ctx.fillText(`„${poolTitle}“`, 450, 258);

    // Draw QR image inside golden frame
    const img = new Image();
    img.src = qrDataUrl;
    await new Promise((resolve) => {
      img.onload = resolve;
    });

    ctx.fillStyle = '#fdf5e6';
    ctx.fillRect(215, 315, 470, 470);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 5;
    ctx.strokeRect(215, 315, 470, 470);
    ctx.drawImage(img, 230, 330, 440, 440);

    // Pool Code pill
    ctx.fillStyle = '#f2d57e';
    ctx.font = '700 40px monospace';
    ctx.fillText(poolCode, 450, 860);

    // Instructions
    ctx.fillStyle = '#e8d6de';
    ctx.font = '400 26px Inter, sans-serif';
    ctx.fillText('1. Naskenuj QR a navrhni si vlastní masku', 450, 940);
    ctx.fillText('2. Hoď tajný návrh nebo chyť cizí jiskru', 450, 986);
    ctx.fillText('3. Sleduj skrytý signál přímo v místnosti', 450, 1032);

    ctx.fillStyle = '#a88f99';
    ctx.font = 'italic 22px Georgia, serif';
    ctx.fillText('Bez pravých jmen • Kdykoliv můžeš spálit masku • Ráno vše shoří', 450, 1105);

    const link = document.createElement('a');
    link.download = `odpustek-qr-${poolCode.toLowerCase()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    onNotify('QR kartička na stůl stažena (PNG)!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/88 backdrop-blur-md p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        className="velvet-card gold-shimmer-border lattice-bg relative max-w-sm w-full rounded-3xl p-6 text-center space-y-4 my-6"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 cursor-pointer rounded-full p-2 text-[#bfa9b2] hover:bg-white/10"
          aria-label="Zavřít"
        >
          <X className="h-5 w-5" />
        </button>

        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#d4af37] flex items-center justify-center gap-1.5">
            <QrCode className="h-3.5 w-3.5" />
            Ukaž mobil ostatním v místnosti
          </p>
          <h3 className="font-serif-display text-3xl font-semibold text-[#fff3e2] mt-1">
            {poolTitle}
          </h3>
          <p className="font-mono text-sm tracking-[0.22em] text-[#f2d57e] mt-0.5">{poolCode}</p>
        </div>

        <div className="mx-auto w-60 h-60 rounded-2xl border-2 border-[#d4af37]/75 bg-[#fdf5e6] p-2.5 shadow-2xl flex items-center justify-center">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt={`QR kód ${poolCode}`} className="w-full h-full rounded-lg" />
          ) : (
            <span className="text-xs text-black/60">Generuji QR…</span>
          )}
        </div>

        <p className="text-xs text-[#cbb5be] leading-relaxed">
          Kdo naskenuje tenhle kód, rovnou si navrhne masku a vstoupí do vašeho Kruhu — bez nutnosti
          znát jeho telefonní číslo.
        </p>

        <div className="grid grid-cols-1 gap-2">
          <button
            type="button"
            onClick={handleDownloadTableCard}
            className="w-full min-h-[46px] cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#c4972f] via-[#e8c66c] to-[#c4972f] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[#17080d]"
          >
            <Download className="h-4 w-4" />
            Stáhnout QR kartičku na stůl (PNG)
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="w-full min-h-[42px] cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-black/40 px-4 py-2 text-xs text-[#e6d5dc] hover:bg-white/10"
          >
            <Copy className="h-3.5 w-3.5" />
            Kopírovat přímý odkaz
          </button>
        </div>
      </motion.div>
    </div>
  );
}
