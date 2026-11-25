import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, PlusCircle, Send, Sparkles } from 'lucide-react';
import { api } from '../api/client';
import type { SinWallEntry } from '../types/confession';

const CATEGORIES = ['Fantazie', 'Dominance', 'Roleplay', 'Tabu', 'Párová jiskra', 'Otevřenost'];

export function SinWall() {
  const [entries, setEntries] = useState<SinWallEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [votedIds, setVotedIds] = useState<Record<string, 'forgive' | 'hell'>>({});
  const [showComposer, setShowComposer] = useState(false);
  const [newText, setNewText] = useState('');
  const [newCategory, setNewCategory] = useState('Fantazie');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEntries = async () => {
    setLoading(true);
    try {
      const data = await api.getSinWall();
      setEntries(data);
    } catch {
      setError('Nepodařilo se načíst Zeď hříchů.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, []);

  const handleVote = async (id: string, vote: 'forgive' | 'hell') => {
    if (votedIds[id]) return;
    setVotedIds((prev) => ({ ...prev, [id]: vote }));
    try {
      const updated = await api.voteSinWall(id, vote);
      setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
    } catch {
      // ignore
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newText.trim().length < 10) {
      setError('Napiš alespoň 10 znaků.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await api.publishToWall({
        confessionText: newText.trim(),
        category: newCategory,
        personaName: 'Anonymní poutník',
        sinIndex: 72 + (newText.length % 24),
        archetype: 'Hlas ze stínu',
      });
      setEntries((prev) => [created, ...prev]);
      setNewText('');
      setShowComposer(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodařilo se přidat zpověď.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[#d4af37]/80 mb-1">
            Anonymní komunita • Uloženo v MSSQL
          </p>
          <h2 className="font-serif-display text-3xl md:text-4xl font-semibold text-[#f8ece4]">
            Zeď hříchů & Rozsudky davu
          </h2>
          <p className="text-sm text-[#bfa8b1] mt-1">
            Přečti si anonymní zpovědi ostatních a rozhodni: zaslouží si odpustek, nebo poslat do pekla?
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowComposer((v) => !v)}
          className="cursor-pointer inline-flex items-center gap-2 self-start rounded-xl border border-[#d4af37]/40 bg-[#270e18] px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#f2d57e] hover:bg-[#3a1423] transition"
        >
          <PlusCircle className="h-4 w-4" />
          Přidat anonymní zpověď
        </button>
      </div>

      {showComposer && (
        <motion.form
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handlePublish}
          className="velvet-card rounded-2xl p-5 space-y-4"
        >
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setNewCategory(cat)}
                className={`cursor-pointer rounded-full px-3 py-1 text-xs transition border ${
                  newCategory === cat
                    ? 'bg-[#8f1833] border-[#f2d57e]/50 text-white'
                    : 'bg-black/30 border-white/10 text-[#bfa8b1] hover:border-[#d4af37]/30'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            rows={3}
            placeholder="Napiš svou anonymní zpověď (bez jmen a citlivých údajů)..."
            className="w-full rounded-xl border border-[#d4af37]/20 bg-[#0d0609]/90 p-3.5 text-sm text-[#f4e8ee] placeholder-[#7d6770] focus:border-[#d4af37]/60 focus:outline-none"
          />
          {error && <p className="text-xs text-red-300">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowComposer(false)}
              className="cursor-pointer rounded-xl px-4 py-2 text-xs text-[#b7a0aa] hover:text-white"
            >
              Zrušit
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#8c1832] to-[#b51f3e] px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white hover:brightness-110 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              {submitting ? 'Odesílám...' : 'Zveřejnit anonymně'}
            </button>
          </div>
        </motion.form>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="velvet-card h-48 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {entries.map((entry) => {
            const total = entry.forgivenCount + entry.hellCount;
            const forgivePct = total > 0 ? Math.round((entry.forgivenCount / total) * 100) : 50;
            const myVote = votedIds[entry.id];

            return (
              <motion.article
                key={entry.id}
                layout
                className="velvet-card rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-[#d4af37]/35 transition"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="rounded-full bg-[#31111d] border border-[#d4af37]/25 px-2.5 py-0.5 text-[11px] font-medium text-[#f2d57e]">
                      {entry.category}
                    </span>
                    <span className="text-[11px] text-[#9b848e]">
                      Index hříchu: <strong className="text-[#f2d57e]">{entry.sinIndex}%</strong>
                    </span>
                  </div>

                  <p className="font-serif-display text-xl italic leading-relaxed text-[#f7ece6]">
                    „{entry.confessionText}“
                  </p>
                </div>

                <div className="space-y-3 pt-2 border-t border-white/5">
                  <div className="flex items-center justify-between text-[11px] text-[#9a848d]">
                    <span>Zpovědník: {entry.personaName}</span>
                    <span className="italic">{entry.archetype}</span>
                  </div>

                  {/* Vote bar */}
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#3a121b] flex">
                    <div
                      className="h-full bg-gradient-to-r from-[#c4972f] to-[#f2d57e] transition-all duration-500"
                      style={{ width: `${forgivePct}%` }}
                    />
                    <div
                      className="h-full bg-gradient-to-r from-[#9e1c38] to-[#e05a2b] transition-all duration-500"
                      style={{ width: `${100 - forgivePct}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      disabled={Boolean(myVote)}
                      onClick={() => handleVote(entry.id, 'forgive')}
                      className={`cursor-pointer flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-medium border transition ${
                        myVote === 'forgive'
                          ? 'bg-[#d4af37]/25 border-[#d4af37] text-[#f8e7c2]'
                          : 'bg-[#1a0d12] border-[#d4af37]/25 text-[#e6d5bc] hover:bg-[#2a171c] disabled:opacity-60'
                      }`}
                    >
                      <Sparkles className="h-3.5 w-3.5 text-[#f2d57e]" />
                      Odpustit ({entry.forgivenCount})
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(myVote)}
                      onClick={() => handleVote(entry.id, 'hell')}
                      className={`cursor-pointer flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-medium border transition ${
                        myVote === 'hell'
                          ? 'bg-[#9e1c38]/40 border-[#e05a2b] text-[#ffd7cf]'
                          : 'bg-[#1a0d12] border-[#9e1c38]/35 text-[#e6bec8] hover:bg-[#2e1019] disabled:opacity-60'
                      }`}
                    >
                      <Flame className="h-3.5 w-3.5 text-[#e05a2b]" />
                      Do pekla ({entry.hellCount})
                    </button>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}
    </div>
  );
}
