import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Crown,
  Database,
  EyeOff,
  Flame,
  HeartHandshake,
  ScrollText,
  Sparkles,
} from 'lucide-react';
import { api, getOrCreateClientId } from './api/client';
import type { HealthStatus, Persona, Wallet } from './types/confession';
import { AgeGateModal } from './components/AgeGateModal';
import { SoloConfessional } from './components/SoloConfessional';
import { CoupleConfessional } from './components/CoupleConfessional';
import { SinWall } from './components/SinWall';
import { OdpustkyModal } from './components/OdpustkyModal';

type TabKey = 'solo' | 'couple' | 'wall';

export default function App() {
  const [clientId] = useState(() => getOrCreateClientId());
  const [ageAccepted, setAgeAccepted] = useState(
    () => sessionStorage.getItem('odpustek_18_ok') === '1'
  );
  const [activeTab, setActiveTab] = useState<TabKey>('solo');
  const [discreetMode, setDiscreetMode] = useState(false);
  const [showShop, setShowShop] = useState(false);

  const [personas, setPersonas] = useState<Persona[]>([]);
  const [wallet, setWallet] = useState<Wallet>({
    clientId,
    odpustkyBalance: 3,
    isVip: false,
    totalConfessions: 0,
  });
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((current) => (current === msg ? null : current));
    }, 3600);
  }, []);

  const refreshWallet = useCallback(async () => {
    try {
      const w = await api.getWallet(clientId);
      setWallet(w);
    } catch {
      // ignore
    }
  }, [clientId]);

  useEffect(() => {
    Promise.all([api.getPersonas(), api.getWallet(clientId), api.getHealth()])
      .then(([p, w, h]) => {
        setPersonas(p);
        setWallet(w);
        setHealth(h);
      })
      .catch(() => {
        notify('Backend API na portu 5150 zatím neběží.');
      });
  }, [clientId, notify]);

  // Esc key toggles Discreet Panic Mode
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && ageAccepted) {
        setDiscreetMode((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [ageAccepted]);

  const handleAcceptAge = () => {
    sessionStorage.setItem('odpustek_18_ok', '1');
    setAgeAccepted(true);
  };

  // Panic / Discreet Overlay (looks like an innocent Czech weather & recipe memo)
  if (discreetMode) {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-800 p-8 font-sans">
        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow p-8 space-y-5">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Kuchařka & Týdenní poznámky
              </h1>
              <p className="text-sm text-slate-500">Podzimní polévky a nákupní seznam</p>
            </div>
            <button
              onClick={() => setDiscreetMode(false)}
              className="cursor-pointer rounded-lg bg-slate-800 px-3.5 py-2 text-xs text-white hover:bg-slate-700"
            >
              Zpět (Esc)
            </button>
          </div>
          <div className="space-y-2 text-sm leading-relaxed text-slate-700">
            <h2 className="font-semibold text-base">Krémová dýňová polévka se zázvorem</h2>
            <p>
              1 dýně hokaido, 2 mrkve, 1 cibule, 20 g čerstvého zázvoru, zeleninový vývar, smetana
              ke šlehání, dýňová semínka. Zeleninu orestujeme na másle, zalijeme vývarem a vaříme
              25 minut do měkka, poté rozmixujeme dohladka.
            </p>
            <h2 className="font-semibold text-base pt-3">Nákup na víkend</h2>
            <ul className="list-disc pl-5 text-slate-600">
              <li>Žitný kváskový chléb, máslo, vejce</li>
              <li>Kávová zrna, ovesné mléko</li>
              <li>Čerstvý koriandr a limetky</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {!ageAccepted && <AgeGateModal onAccept={handleAcceptAge} />}

      {/* Sticky Top Header */}
      <header className="sticky top-0 z-30 border-b border-[#d4af37]/15 bg-[#0a0508]/85 backdrop-blur-lg">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('solo')}
            className="cursor-pointer flex items-center gap-2.5 text-left"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#d4af37]/40 bg-gradient-to-br from-[#4d1022] to-[#1a080e] text-[#f2d57e] shadow">
              <Flame className="h-4.5 w-4.5" />
            </div>
            <div>
              <span className="font-serif-display text-2xl font-semibold tracking-wider text-[#f8ece4] leading-none block">
                ODPUSTEK
              </span>
              <span className="text-[10px] uppercase tracking-[0.22em] text-[#b49aa5] hidden sm:block">
                Zpovědnice hříchů • 18+
              </span>
            </div>
          </button>

          {/* Main Navigation */}
          <nav className="hidden md:flex items-center gap-1 rounded-2xl border border-[#d4af37]/15 bg-[#13080d]/90 p-1">
            {(
              [
                ['solo', 'Solo Zpovědnice', Flame],
                ['couple', 'Párová zpovědnice', HeartHandshake],
                ['wall', 'Zeď hříchů', ScrollText],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`cursor-pointer inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium transition ${
                  activeTab === key
                    ? 'bg-gradient-to-r from-[#7d152d] to-[#9e1c38] text-white shadow'
                    : 'text-[#bfa8b1] hover:text-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </nav>

          {/* Right Controls: Wallet + Discreet Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowShop(true)}
              className="cursor-pointer inline-flex items-center gap-2 rounded-xl border border-[#d4af37]/40 bg-[#220c14] px-3.5 py-2 text-xs font-medium text-[#f2d57e] hover:bg-[#33111d] transition"
            >
              {wallet.isVip ? (
                <Crown className="h-3.5 w-3.5 text-[#f2d57e]" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-[#f2d57e]" />
              )}
              <span>{wallet.odpustkyBalance} Odpustků</span>
              {wallet.isVip && (
                <span className="rounded bg-[#d4af37] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#19090e]">
                  VIP
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setDiscreetMode(true)}
              title="Diskrétní režim (klávesa Esc)"
              className="cursor-pointer rounded-xl border border-white/10 bg-[#150a0f] p-2 text-[#b8a2ab] hover:border-[#d4af37]/30 hover:text-white transition"
            >
              <EyeOff className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Mobile Tab Bar */}
        <div className="flex md:hidden border-t border-white/5 px-2 py-1.5 gap-1">
          {(
            [
              ['solo', 'Solo', Flame],
              ['couple', 'Párová', HeartHandshake],
              ['wall', 'Zeď hříchů', ScrollText],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`flex-1 cursor-pointer inline-flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-medium ${
                activeTab === key
                  ? 'bg-[#8f1833] text-white'
                  : 'text-[#bfa8b1]'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 py-8 md:py-10">
        {activeTab === 'solo' && (
          <SoloConfessional
            clientId={clientId}
            personas={personas}
            wallet={wallet}
            onWalletChange={setWallet}
            onOpenShop={() => setShowShop(true)}
            onNotify={notify}
          />
        )}

        {activeTab === 'couple' && (
          <CoupleConfessional
            clientId={clientId}
            personas={personas}
            wallet={wallet}
            onRefreshWallet={refreshWallet}
            onOpenShop={() => setShowShop(true)}
            onNotify={notify}
          />
        )}

        {activeTab === 'wall' && <SinWall />}
      </main>

      {/* Footer with live .NET 10 + MSSQL telemetry */}
      <footer className="border-t border-[#d4af37]/10 bg-[#070406]/90 py-5 px-4">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#8f7982]">
          <p>
            ODPUSTEK • Online Zpovědnice Hříchů (.NET 10 + React + TypeScript + MSSQL)
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-[#d4af37]" />
              {health?.dbConnected ? 'MSSQL ZpovedniceDb připojena' : 'Čekám na API…'}
            </span>
            <span className="text-white/20">|</span>
            <span>
              AI režim:{' '}
              <strong className="text-[#cbb5be]">
                {health?.aiMode === 'live-llm' ? 'Live LLM API' : 'Crafted Czech Demo'}
              </strong>
            </span>
          </div>
        </div>
      </footer>

      {/* Odpustky Shop Modal */}
      {showShop && (
        <OdpustkyModal
          clientId={clientId}
          wallet={wallet}
          onClose={() => setShowShop(false)}
          onWalletUpdated={(w, msg) => {
            setWallet(w);
            notify(msg);
          }}
        />
      )}

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-5 right-5 z-50 rounded-2xl border border-[#d4af37]/50 bg-[#240c15]/95 px-5 py-3 text-xs font-medium text-[#f8e7c2] shadow-2xl backdrop-blur"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
