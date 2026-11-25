import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Flame, Sparkles } from 'lucide-react';
import { api } from '../api/client';
import type { DailyQuestion } from '../types/confession';

interface DailyQuestionBannerProps {
  onExploreInSolo: (seedText: string) => void;
}

export function DailyQuestionBanner({ onExploreInSolo }: DailyQuestionBannerProps) {
  const [question, setQuestion] = useState<DailyQuestion | null>(null);
  const [myChoice, setMyChoice] = useState<'A' | 'B' | null>(() => {
    const saved = localStorage.getItem('odpustek_daily_choice');
    return saved === 'A' || saved === 'B' ? saved : null;
  });

  useEffect(() => {
    api
      .getDailyQuestion()
      .then((q) => {
        const savedKey = localStorage.getItem('odpustek_daily_key');
        if (savedKey !== q.questionKey) {
          setMyChoice(null);
        }
        setQuestion(q);
      })
      .catch(() => {});
  }, []);

  if (!question) return null;

  const total = question.votesA + question.votesB;
  const pctA = total > 0 ? Math.round((question.votesA / total) * 100) : 50;
  const pctB = 100 - pctA;

  const handleVote = async (choice: 'A' | 'B') => {
    if (myChoice) return;
    setMyChoice(choice);
    localStorage.setItem('odpustek_daily_choice', choice);
    localStorage.setItem('odpustek_daily_key', question.questionKey);
    try {
      const updated = await api.voteDailyQuestion(question.id, choice);
      setQuestion(updated);
    } catch {
      // ignore
    }
  };

  return (
    <section className="velvet-card rounded-2xl p-4 sm:p-5 border border-[#d4af37]/25">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f2d57e]">
          <Sparkles className="h-3.5 w-3.5" />
          Hříšná otázka dne
        </span>
        <span className="text-[11px] text-[#9b848e]">{total} hlasů dnes</span>
      </div>

      <p className="font-serif-display text-lg sm:text-xl text-[#f8ece4] leading-snug mb-3.5">
        {question.questionText}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {(
          [
            ['A', question.optionA, pctA],
            ['B', question.optionB, pctB],
          ] as const
        ).map(([choice, label, pct]) => {
          const picked = myChoice === choice;
          return (
            <button
              key={choice}
              type="button"
              disabled={Boolean(myChoice)}
              onClick={() => handleVote(choice)}
              className={`relative overflow-hidden cursor-pointer rounded-xl px-4 py-3 text-left text-xs sm:text-sm border transition min-h-[48px] ${
                picked
                  ? 'border-[#d4af37] bg-[#361120] text-[#fff4e0]'
                  : 'border-white/10 bg-black/35 text-[#dfd0d6] hover:border-[#d4af37]/45'
              }`}
            >
              {myChoice && (
                <div
                  className="pointer-events-none absolute inset-y-0 left-0 bg-[#9e1c38]/35 transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              )}
              <div className="relative z-10 flex items-center justify-between gap-2">
                <span className="font-medium">{label}</span>
                {myChoice && (
                  <span className="font-semibold text-[#f2d57e] shrink-0">{pct} %</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {myChoice && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-[#14080d]/90 border border-[#d4af37]/20 p-3.5"
        >
          <p className="text-xs sm:text-sm italic text-[#e5d2da] leading-relaxed">
            <Flame className="inline h-3.5 w-3.5 text-[#d4af37] mr-1.5 -mt-0.5" />
            „{myChoice === 'A' ? question.confessorCommentA : question.confessorCommentB}“
          </p>
          <button
            type="button"
            onClick={() =>
              onExploreInSolo(
                `Zaujala mě dnešní otázka a vybral/a jsem si: „${
                  myChoice === 'A' ? question.optionA : question.optionB
                }“. Chci to prozkoumat hlouběji.`
              )
            }
            className="cursor-pointer shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-[#2e101c] border border-[#d4af37]/35 px-3 py-2 text-xs font-medium text-[#f2d57e] hover:bg-[#431628] transition"
          >
            Rozvést za mřížkou
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}
    </section>
  );
}
