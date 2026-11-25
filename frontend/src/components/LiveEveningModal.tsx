import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  Music,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { CoupleScenario } from '../types/confession';
import { ambientAudio } from '../utils/ambientAudio';

interface LiveEveningModalProps {
  scenario: CoupleScenario;
  onClose: () => void;
  onFinishAndBurn: () => void;
}

type StepMood = 'gentle' | 'standard' | 'bold';

export function LiveEveningModal({
  scenario,
  onClose,
  onFinishAndBurn,
}: LiveEveningModalProps) {
  const [stepIdx, setStepIdx] = useState(0);
  const [mood, setMood] = useState<StepMood>('standard');
  const [secondsLeft, setSecondsLeft] = useState(
    (scenario.steps[0]?.durationMinutes || 15) * 60
  );
  const [timerRunning, setTimerRunning] = useState(false);
  const [ambientOn, setAmbientOn] = useState(() => ambientAudio.isRunning());
  const [isSpeaking, setIsSpeaking] = useState(false);

  const step = scenario.steps[stepIdx];

  useEffect(() => {
    setSecondsLeft((step?.durationMinutes || 15) * 60);
    setTimerRunning(false);
    setMood('standard');
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [stepIdx, step?.durationMinutes]);

  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [timerRunning]);

  const activeText =
    mood === 'gentle' && step.gentleVariation
      ? step.gentleVariation
      : mood === 'bold' && step.boldVariation
        ? step.boldVariation
        : step.instruction;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const toggleSpeak = () => {
    if (!('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(`${step.phase}. ${step.title}. ${activeText}`);
    u.lang = 'cs-CZ';
    u.rate = 0.86;
    u.pitch = 0.84;
    u.onend = () => setIsSpeaking(false);
    u.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(u);
  };

  const toggleAmbient = () => {
    const on = ambientAudio.toggle();
    setAmbientOn(on);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#060305] text-[#f8ece4] overflow-y-auto">
      {/* Subtle candle ambiance */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(158,28,56,0.28),transparent_60%)] candle-glow" />

      {/* Top minimal bar */}
      <div className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/10">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#d4af37]">
            Večer rozhřešení živě
          </p>
          <p className="font-serif-display text-lg text-[#f8ece4]">{scenario.title}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleAmbient}
            className={`cursor-pointer rounded-xl border px-3 py-2 text-xs flex items-center gap-1.5 transition ${
              ambientOn
                ? 'border-[#d4af37] bg-[#361120] text-[#f2d57e]'
                : 'border-white/15 bg-white/5 text-[#bfa9b2]'
            }`}
          >
            <Music className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{ambientOn ? 'Déšť & svíčka' : 'Zvuk'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if ('speechSynthesis' in window) window.speechSynthesis.cancel();
              onClose();
            }}
            className="cursor-pointer rounded-xl border border-white/15 bg-white/5 p-2 text-[#d6c2ca] hover:bg-white/15"
            aria-label="Zavřít živý režim"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main Centered Ritual Stage */}
      <div className="relative z-10 flex-1 flex flex-col justify-center max-w-xl w-full mx-auto px-5 py-6 space-y-6">
        {/* Step dots */}
        <div className="flex items-center justify-center gap-2">
          {scenario.steps.map((s, idx) => (
            <button
              key={s.stepNumber}
              type="button"
              onClick={() => setStepIdx(idx)}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                idx === stepIdx ? 'w-10 bg-[#f2d57e]' : 'w-2.5 bg-white/20'
              }`}
              aria-label={`Fáze ${idx + 1}`}
            />
          ))}
        </div>

        <motion.div
          key={`${stepIdx}-${mood}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="velvet-card gold-shimmer-border rounded-3xl p-6 sm:p-8 text-center space-y-5"
        >
          <p className="text-xs uppercase tracking-[0.28em] text-[#d4af37]">
            Fáze 0{step.stepNumber} / 0{scenario.steps.length} • {step.phase}
          </p>

          <h2 className="font-serif-display text-3xl sm:text-4xl font-semibold text-[#fff3e2]">
            {step.title}
          </h2>

          <p className="text-base sm:text-lg text-[#eedce4] leading-relaxed">
            {activeText}
          </p>

          {/* Live Mood / Pace Switcher */}
          <div className="pt-2">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[#9b848e] mb-2">
              Upravit tempo této fáze za běhu
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ['gentle', 'Zpomalit'],
                  ['standard', 'Rituál'],
                  ['bold', 'Přitvrdit 🔥'],
                ] as const
              ).map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMood(m)}
                  className={`cursor-pointer rounded-xl py-2.5 text-xs font-medium border transition ${
                    mood === m
                      ? 'bg-[#8f1833] border-[#f2d57e]/70 text-white shadow'
                      : 'bg-black/40 border-white/10 text-[#c4aeb7] hover:border-[#d4af37]/30'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Timer + Read Aloud */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-3 border-t border-white/10">
            <div className="font-mono text-2xl font-semibold text-[#f2d57e] min-w-[78px]">
              {formatTime(secondsLeft)}
            </div>
            <button
              type="button"
              onClick={() => setTimerRunning((r) => !r)}
              className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl bg-[#2c101b] border border-[#d4af37]/40 px-4 py-2.5 text-xs font-medium text-[#fff2dc]"
            >
              {timerRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {timerRunning ? 'Pauza' : 'Spustit čas'}
            </button>
            <button
              type="button"
              onClick={() => {
                setTimerRunning(false);
                setSecondsLeft((step.durationMinutes || 15) * 60);
              }}
              className="cursor-pointer rounded-xl border border-white/15 p-2.5 text-[#c4aeb7] hover:text-white"
              title="Resetovat čas"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={toggleSpeak}
              className={`cursor-pointer inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-medium ${
                isSpeaking
                  ? 'border-[#f2d57e] bg-[#9e1c38] text-white'
                  : 'border-[#d4af37]/30 bg-black/40 text-[#f2d57e]'
              }`}
            >
              {isSpeaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              Přečíst
            </button>
          </div>
        </motion.div>

        {/* Bottom Navigation */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={stepIdx === 0}
            onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
            className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-xs font-medium text-[#d6c2ca] disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
            Předchozí
          </button>

          {stepIdx < scenario.steps.length - 1 ? (
            <button
              type="button"
              onClick={() => setStepIdx((i) => i + 1)}
              className="flex-1 cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7d152d] to-[#a31d3c] py-3.5 px-5 text-xs font-semibold uppercase tracking-widest text-white border border-[#f2d57e]/40"
            >
              Další fáze
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onFinishAndBurn}
              className="flex-1 cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#b8321a] to-[#9e1c38] py-3.5 px-5 text-xs font-semibold uppercase tracking-widest text-white border border-[#ffbe76]/45"
            >
              <Flame className="h-4 w-4" />
              Dokončit & Spálit noc
            </button>
          )}
        </div>

        <p className="text-center text-[11px] text-[#8d7680] flex items-center justify-center gap-1.5">
          <Sparkles className="h-3 w-3 text-[#d4af37]" />
          Kdykoliv můžeš stisknout Esc pro diskrétní režim.
        </p>
      </div>
    </div>
  );
}
