import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Compass,
  Database,
  EyeOff,
  Flame,
  HeartHandshake,
  Music,
  ScrollText,
  Sparkles,
  Users,
} from 'lucide-react';
import { api, getOrCreateClientId } from './api/client';
import type { DesireProfile, HealthStatus, Persona } from './types/confession';
import { ambientAudio } from './utils/ambientAudio';
import { AgeGateModal } from './components/AgeGateModal';
import { GroupPool } from './components/GroupPool';
import { CoupleConfessional } from './components/CoupleConfessional';
import { DesireAtlas } from './components/DesireAtlas';
import { SinWall } from './components/SinWall';

type TabKey = 'pool' | 'couple' | 'wall' | 'atlas';

function parseDeepLinkFromUrl(): {
  poolCode: string | null;
  roomCode: string | null;
  partnerRole: 'A' | 'B' | null;
} {
  const params = new URLSearchParams(window.location.search);
  const pool = params.get('pool');
  const room = params.get('room');
  const partner = params.get('partner')?.toUpperCase();
  return {
    poolCode: pool ? pool.trim().toUpperCase() : null,
    roomCode: room ? room.trim().toUpperCase() : null,
    partnerRole: partner === 'A' || partner === 'B' ? partner : null,
  };
}

export default function App() {
  const [clientId] = useState(() => getOrCreateClientId());
  const [deepLink] = useState(() => parseDeepLinkFromUrl());
  const [ageAccepted, setAgeAccepted] = useState(
    () => sessionStorage.getItem('odpustek_18_ok') === '1'
  );
  // Auto-open Couple tab if ?room= link was clicked; otherwise Tajný Kruh (Group Pool) is the primary flagship!
  const [activeTab, setActiveTab] = useState<TabKey>(() =>
    deepLink.roomCode ? 'couple' : 'pool'
  );
  const [discreetMode, setDiscreetMode] = useState(false);
  const [ambientOn, setAmbientOn] = useState(false);

  const [personas, setPersonas] = useState<Persona[]>([]);
  const [profile, setProfile] = useState<DesireProfile>({
    clientId,
    dominanceAxis: 50,
    tabooAxis: 50,
    mindBodyAxis: 50,
    ritualAxis: 50,
    intensityAxis: 50,
    opennessAxis: 45,
    completedConfessions: 0,
    completedPenances: 0,
    completedCoupleNights: 0,
    initiationLevel: 1,
    revealPercent: 18,
    primaryArchetype: 'Neznámý poutník',
    portraitSummary: 'Tvůj Atlas touhy se teprve probouzí.',
    blindSpotInsight: 'Začni v Tajném Kruhu na párty nebo v Párové zpovědnici.',
  });
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((current) => (current === msg ? null : current));
    }, 3600);
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const p = await api.getProfile(clientId);
      setProfile(p);
    } catch {
      // ignore
    }
  }, [clientId]);

  useEffect(() => {
    Promise.all([api.getPersonas(), api.getProfile(clientId), api.getHealth()])
      .then(([p, prof, h]) => {
        setPersonas(p);
        setProfile(prof);
        setHealth(h);
      })
      .catch(() => {
        notify('Backend API zatím neodpovídá.');
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

  const handleToggleAmbient = () => {
    const running = ambientAudio.toggle();
    setAmbientOn(running);
    notify(running ? 'Zvuková kulisa: noční déšť a svíčka zapnuta.' : 'Zvuková kulisa vypnuta.');
  };

  if (discreetMode) {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-800 p-6 sm:p-8 font-sans">
        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow p-6 sm:p-8 space-y-5">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                Kuchařka & Týdenní poznámky
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">Podzimní polévky a nákupní seznam</p>
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
          </div>
        </div>
      </div>
    );
  }

  const navItems = [
    ['pool', 'Kruh', 'Tajný Kruh (Skupina)', Users],
    ['couple', 'Párová', 'Párová (Pro dva)', HeartHandshake],
    ['wall', 'Zeď', 'Zeď hříchů', ScrollText],
    ['atlas', 'Atlas', 'Atlas touhy', Compass],
  ] as const;

  return (
    <div className="min-h-screen flex flex-col">
      {!ageAccepted && <AgeGateModal onAccept={handleAcceptAge} />}

      {/* Compact Sticky Top Header */}
      <header className="sticky top-0 z-30 border-b border-[#d4af37]/15 bg-[#0a0508]/90 backdrop-blur-lg">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-15 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('pool')}
            className="cursor-pointer flex items-center gap-2.5 text-left"
          >
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-[#d4af37]/40 bg-gradient-to-br from-[#4d1022] to-[#1a080e] text-[#f2d57e] shadow">
              <Flame className="h-4 w-4" />
            </div>
            <div>
              <span className="font-serif-display text-xl sm:text-2xl font-semibold tracking-wider text-[#f8ece4] leading-none block">
                ODPUSTEK
              </span>
              <span className="text-[9px] uppercase tracking-[0.2em] text-[#b49aa5] hidden sm:block">
                Tajný Kruh & Párová zpovědnice • 18+
              </span>
            </div>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 rounded-2xl border border-[#d4af37]/15 bg-[#13080d]/90 p-1">
            {navItems.map(([key, , fullLabel, Icon]) => (
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
                {fullLabel}
              </button>
            ))}
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('atlas')}
              className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-[#d4af37]/30 bg-[#1e0b12] px-2.5 sm:px-3 py-1.5 text-[11px] font-medium text-[#f2d57e] hover:bg-[#2d101b] transition"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Otevřený pilot</span>
              <span className="rounded bg-[#d4af37]/20 px-1.5 py-0.5 text-[10px]">
                Úr. {profile.initiationLevel}
              </span>
            </button>

            <button
              type="button"
              onClick={handleToggleAmbient}
              title="Zvuková kulisa (noční déšť & svíčka)"
              className={`cursor-pointer rounded-xl border p-2 transition ${
                ambientOn
                  ? 'border-[#d4af37] bg-[#361120] text-[#f2d57e]'
                  : 'border-white/10 bg-[#150a0f] text-[#b8a2ab] hover:text-white'
              }`}
            >
              <Music className="h-4 w-4" />
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
      </header>

      {/* Main Content */}
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 sm:px-6 pt-5 pb-24 md:py-9">
        {activeTab === 'pool' && (
          <GroupPool
            clientId={clientId}
            initialPoolCode={deepLink.poolCode}
            onProfileRefresh={refreshProfile}
            onNotify={notify}
          />
        )}

        {activeTab === 'couple' && (
          <CoupleConfessional
            clientId={clientId}
            personas={personas}
            initialRoomCode={deepLink.roomCode}
            initialPartnerRole={deepLink.partnerRole}
            onProfileRefresh={refreshProfile}
            onNotify={notify}
          />
        )}

        {activeTab === 'wall' && <SinWall />}

        {activeTab === 'atlas' && (
          <DesireAtlas
            profile={profile}
            onStartPool={() => setActiveTab('pool')}
            onStartCouple={() => setActiveTab('couple')}
          />
        )}
      </main>

      {/* Desktop Footer */}
      <footer className="hidden md:block border-t border-[#d4af37]/10 bg-[#070406]/90 py-4 px-4">
        <div className="mx-auto max-w-6xl flex items-center justify-between gap-3 text-xs text-[#8f7982]">
          <p>ODPUSTEK • Tajný Kruh & Párová zpovědnice (.NET 10 + React + MSSQL)</p>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-[#d4af37]" />
              {health?.dbConnected ? 'MSSQL připojena' : 'Čekám na API…'}
            </span>
          </div>
        </div>
      </footer>

      {/* Mobile-First Bottom Thumb Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-[#d4af37]/20 bg-[#0b0508]/95 backdrop-blur-xl px-2 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-4 gap-1">
          {navItems.map(([key, shortLabel, , Icon]) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`cursor-pointer flex flex-col items-center justify-center gap-1 rounded-xl py-2 min-h-[50px] transition ${
                  active
                    ? 'bg-gradient-to-b from-[#7d152d] to-[#560d1e] text-[#fff3e2] border border-[#d4af37]/40'
                    : 'text-[#a9929c]'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 ${active ? 'text-[#f2d57e]' : ''}`} />
                <span className="text-[10px] font-medium tracking-wide">{shortLabel}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-20 md:bottom-5 left-4 right-4 sm:left-auto sm:right-5 z-50 rounded-2xl border border-[#d4af37]/50 bg-[#240c15]/95 px-5 py-3 text-xs font-medium text-[#f8e7c2] shadow-2xl backdrop-blur text-center sm:text-left"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
