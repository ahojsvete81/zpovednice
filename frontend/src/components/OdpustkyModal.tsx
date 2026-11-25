import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Crown, Flame, HeartHandshake, Sparkles, X } from 'lucide-react';
import { api } from '../api/client';
import type { Wallet } from '../types/confession';

interface OdpustkyModalProps {
  clientId: string;
  wallet: Wallet;
  onClose: () => void;
  onWalletUpdated: (wallet: Wallet, toastMsg: string) => void;
}

const PACKAGES = [
  {
    code: 'couple_night' as const,
    name: 'Večer rozhřešení pro dva',
    price: '99 Kč',
    subtitle: 'Jednorázový zážitek',
    badge: 'Oblíbené pro páry',
    icon: HeartHandshake,
    features: [
      '+3 Odpustky okamžitě na účet',
      'Odemkne Párovou zpovědnici (Blind Matching)',
      '3-fázový večerní scénář na míru',
    ],
    highlight: false,
  },
  {
    code: 'vip_month' as const,
    name: 'Řád Hříšníků VIP',
    price: '249 Kč / měs.',
    subtitle: 'Neomezený přístup',
    badge: 'Nejlepší hodnota',
    icon: Crown,
    features: [
      'Všichni prémioví Zpovědníci (Abatyše, Mefisto) zdarma',
      'Neomezený Párový mód + 25 bonusových Odpustků',
      'Šeptané hlasové rozhřešení & všechny intenzity',
      'Diskrétní název platby na výpisu',
    ],
    highlight: true,
  },
  {
    code: 'pack_10' as const,
    name: 'Balíček 10 Odpustků',
    price: '149 Kč',
    subtitle: 'Kredity bez předplatného',
    badge: 'Flexibilní',
    icon: Flame,
    features: [
      '+10 Odpustků bez časové expirace',
      'Platí na prémiové Zpovědníky i Párové večery',
      'Okamžité připsání do SQL peněženky',
    ],
    highlight: false,
  },
];

export function OdpustkyModal({ clientId, wallet, onClose, onWalletUpdated }: OdpustkyModalProps) {
  const [loadingCode, setLoadingCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleBuy = async (code: 'couple_night' | 'pack_10' | 'vip_month') => {
    setLoadingCode(code);
    setError(null);
    try {
      const res = await api.purchasePackage(clientId, code);
      onWalletUpdated(res.wallet, res.message);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Platba se nezdařila.');
    } finally {
      setLoadingCode(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="velvet-card gold-shimmer-border relative max-w-4xl w-full rounded-2xl p-6 md:p-8 my-8"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 cursor-pointer rounded-full p-2 text-[#bfa9b2] hover:bg-white/10 hover:text-white transition"
          aria-label="Zavřít"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center mb-7">
          <p className="text-xs uppercase tracking-[0.25em] text-[#d4af37] mb-1.5">
            Prodej odpustků 21. století
          </p>
          <h2 className="font-serif-display text-3xl md:text-4xl font-semibold text-[#f8ece4]">
            Pořiď si Odpustky & Odemkni plný rituál
          </h2>
          <p className="text-sm text-[#c4b0b8] mt-2">
            Aktuální stav:{' '}
            <span className="text-[#f2d57e] font-semibold">{wallet.odpustkyBalance} Odpustků</span>
            {wallet.isVip && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-[#d4af37]/20 px-2 py-0.5 text-xs text-[#f2d57e]">
                <Crown className="h-3 w-3" /> Člen Řádu Hříšníků
              </span>
            )}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-950/50 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PACKAGES.map((pkg) => {
            const Icon = pkg.icon;
            return (
              <div
                key={pkg.code}
                className={`relative flex flex-col rounded-2xl p-5 border transition ${
                  pkg.highlight
                    ? 'bg-gradient-to-b from-[#34101d] to-[#17090e] border-[#d4af37]/65 shadow-xl shadow-[#9e1c38]/25'
                    : 'bg-[#140a0f]/80 border-[#d4af37]/20'
                }`}
              >
                <span
                  className={`self-start rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider mb-3 ${
                    pkg.highlight
                      ? 'bg-[#d4af37] text-[#17090e]'
                      : 'bg-white/10 text-[#f2d57e]'
                  }`}
                >
                  {pkg.badge}
                </span>

                <div className="flex items-center gap-2.5 mb-2">
                  <Icon className="h-5 w-5 text-[#f2d57e]" />
                  <h3 className="font-serif-display text-2xl font-semibold text-[#f8ece4]">
                    {pkg.name}
                  </h3>
                </div>

                <div className="mb-4">
                  <span className="text-2xl font-semibold text-[#f2d57e]">{pkg.price}</span>
                  <span className="block text-xs text-[#9e8992]">{pkg.subtitle}</span>
                </div>

                <ul className="space-y-2 mb-6 flex-1">
                  {pkg.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-[#d6c2ca]">
                      <Check className="h-3.5 w-3.5 text-[#d4af37] shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  disabled={loadingCode !== null}
                  onClick={() => handleBuy(pkg.code)}
                  className={`w-full cursor-pointer rounded-xl py-2.5 px-4 text-xs font-semibold uppercase tracking-wider transition flex items-center justify-center gap-2 ${
                    pkg.highlight
                      ? 'bg-gradient-to-r from-[#c4972f] via-[#e6c166] to-[#c4972f] text-[#14080c] hover:brightness-110'
                      : 'bg-[#2a1019] border border-[#d4af37]/35 text-[#f8ece4] hover:bg-[#3e1624]'
                  } disabled:opacity-50`}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {loadingCode === pkg.code ? 'Připisuji...' : 'Aktivovat (Demo Stripe)'}
                </button>
              </div>
            );
          })}
        </div>

        <p className="mt-5 text-center text-[11px] text-[#8c7780]">
          MVP Demo režim: Kliknutím se simuluje Stripe platba a transakce se uloží do tvé lokální MSSQL databáze (tabulka{' '}
          <code className="text-[#c8b2bb]">CreditTransactions</code>).
        </p>
      </motion.div>
    </div>
  );
}
