'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Match, Profile, Bet } from '@/types/database';
import { Users, Save, CheckCircle2, RefreshCw, Sparkles } from 'lucide-react';

interface AdminFamilyBetsEditorProps {
  matches: Match[];
  profiles: Profile[];
  onSaved?: () => void;
}

interface MemberBetDraft {
  enabled: boolean;
  predicted_goals_barca: number;
  predicted_goals_rival: number;
  is_joker: boolean;
}

export function AdminFamilyBetsEditor({ matches, profiles, onSaved }: AdminFamilyBetsEditorProps) {
  const [selectedMatchId, setSelectedMatchId] = useState<string>(matches[0]?.id || '');
  const [betsDraft, setBetsDraft] = useState<Record<string, MemberBetDraft>>({});
  const [loadingBets, setLoadingBets] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const supabase = createClient();
  const selectedMatch = matches.find((m) => m.id === selectedMatchId) || matches[0];

  // Carregar les apostes existents quan canvia el partit seleccionat
  useEffect(() => {
    if (!selectedMatchId && matches.length > 0) {
      setSelectedMatchId(matches[0].id);
      return;
    }

    if (!selectedMatchId) return;

    async function loadMatchBets() {
      try {
        setLoadingBets(true);
        setFeedback(null);

        const { data: existingBets } = await supabase
          .from('bets')
          .select('*')
          .eq('match_id', selectedMatchId);

        const drafts: Record<string, MemberBetDraft> = {};

        // Inicialitzar per a cada membre
        profiles.forEach((p) => {
          const found = existingBets?.find((b: Bet) => b.user_id === p.id);
          if (found) {
            drafts[p.id] = {
              enabled: true,
              predicted_goals_barca: found.predicted_goals_barca,
              predicted_goals_rival: found.predicted_goals_rival,
              is_joker: found.is_joker,
            };
          } else {
            drafts[p.id] = {
              enabled: false,
              predicted_goals_barca: 2,
              predicted_goals_rival: 1,
              is_joker: false,
            };
          }
        });

        setBetsDraft(drafts);
      } catch (err: any) {
        console.error('Error carregant apostes:', err);
      } finally {
        setLoadingBets(false);
      }
    }

    loadMatchBets();
  }, [selectedMatchId, profiles, matches]);

  const updateMemberDraft = (
    userId: string,
    field: 'enabled' | 'predicted_goals_barca' | 'predicted_goals_rival' | 'is_joker',
    value: any
  ) => {
    setBetsDraft((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]: value,
      },
    }));
  };

  const handleSaveAllBets = async () => {
    if (!selectedMatchId) return;

    setSaving(true);
    setFeedback(null);

    try {
      let savedCount = 0;
      let removedCount = 0;

      for (const profile of profiles) {
        const draft = betsDraft[profile.id];
        if (!draft) continue;

        if (draft.enabled) {
          // Upsert de l'aposta
          const { error: upsertErr } = await supabase
            .from('bets')
            .upsert(
              {
                user_id: profile.id,
                match_id: selectedMatchId,
                predicted_goals_barca: draft.predicted_goals_barca,
                predicted_goals_rival: draft.predicted_goals_rival,
                is_joker: draft.is_joker,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id,match_id' }
            );

          if (upsertErr) throw upsertErr;
          savedCount++;
        } else {
          // Si està desmarcat, eliminar si n'hi havia
          await supabase
            .from('bets')
            .delete()
            .eq('user_id', profile.id)
            .eq('match_id', selectedMatchId);
          removedCount++;
        }
      }

      // Si el partit està finalitzat, forçar el càlcul automàtic de punts a la BD
      if (selectedMatch?.status === 'finished') {
        const { error: rpcErr } = await supabase.rpc('calculate_match_points', { target_match_id: selectedMatchId });
        if (rpcErr) throw rpcErr;
      }

      setFeedback({
        type: 'success',
        text: `S'han desat les apostes de ${savedCount} familiars i s'han recalculat els punts!`,
      });

      if (onSaved) onSaved();
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', text: 'Error desant: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  const isHome = selectedMatch?.home_away === 'HOME';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-5">
      <div>
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-barca-blue" />
          Apostes de la Família per Partit (Passats o Actuals)
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Tria el partit i indica què va apostar cada membre de la família per calcular o corregir els punts històrics.
        </p>
      </div>

      {matches.length === 0 ? (
        <p className="text-xs text-slate-400 italic">No hi ha partits creats.</p>
      ) : (
        <div className="space-y-4">
          {/* Selector de partit */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Selecciona el partit a gestionar:
            </label>
            <select
              value={selectedMatchId}
              onChange={(e) => setSelectedMatchId(e.target.value)}
              className="w-full rounded-xl bg-slate-50 border border-slate-300 px-3.5 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:border-barca-blue"
            >
              {matches.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.competition} | {m.home_away === 'HOME' ? `Barça vs ${m.rival}` : `${m.rival} vs Barça`} (
                  {m.status === 'finished' ? `Finalitzat: ${m.goals_barca}-${m.goals_rival}` : 'Pendent'})
                </option>
              ))}
            </select>
          </div>

          {loadingBets ? (
            <div className="py-8 text-center text-slate-400">
              <RefreshCw className="mx-auto h-6 w-6 animate-spin text-barca-blue mb-2" />
              <span className="text-xs">Carregant apostes de la família...</span>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-2 pb-1 border-b border-slate-100">
                <span>Familiar</span>
                <span>
                  Resultat ({isHome ? 'Barça - Rival' : 'Rival - Barça'})
                </span>
              </div>

              {profiles.map((profile) => {
                const draft = betsDraft[profile.id] || {
                  enabled: false,
                  predicted_goals_barca: 2,
                  predicted_goals_rival: 1,
                  is_joker: false,
                };

                return (
                  <div
                    key={profile.id}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      draft.enabled
                        ? 'bg-blue-50/50 border-blue-200 shadow-xs'
                        : 'bg-slate-50/70 border-slate-200 opacity-60'
                    }`}
                  >
                    {/* Checkbox i nom del familiar */}
                    <label className="flex items-center gap-3 cursor-pointer min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={draft.enabled}
                        onChange={(e) => updateMemberDraft(profile.id, 'enabled', e.target.checked)}
                        className="h-4 w-4 rounded text-barca-blue focus:ring-barca-blue border-slate-300"
                      />
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: profile.avatar_color || '#004D98' }}
                        />
                        <span className="text-sm font-bold text-slate-900 truncate">
                          {profile.nom}
                        </span>
                      </div>
                    </label>

                    {/* Inputs de gols si està actiu */}
                    {draft.enabled ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Gols Barça */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              updateMemberDraft(
                                profile.id,
                                'predicted_goals_barca',
                                Math.max(0, draft.predicted_goals_barca - 1)
                              )
                            }
                            className="w-7 h-7 rounded-lg bg-white border border-slate-300 font-bold text-slate-700 text-xs flex items-center justify-center hover:bg-slate-100"
                          >
                            –
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={draft.predicted_goals_barca}
                            onChange={(e) =>
                              updateMemberDraft(
                                profile.id,
                                'predicted_goals_barca',
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-9 h-8 rounded-lg bg-white border border-slate-300 text-center font-bold text-sm text-slate-900"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateMemberDraft(
                                profile.id,
                                'predicted_goals_barca',
                                draft.predicted_goals_barca + 1
                              )
                            }
                            className="w-7 h-7 rounded-lg bg-white border border-slate-300 font-bold text-slate-700 text-xs flex items-center justify-center hover:bg-slate-100"
                          >
                            +
                          </button>
                        </div>

                        <span className="font-bold text-slate-400 px-0.5">:</span>

                        {/* Gols Rival */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              updateMemberDraft(
                                profile.id,
                                'predicted_goals_rival',
                                Math.max(0, draft.predicted_goals_rival - 1)
                              )
                            }
                            className="w-7 h-7 rounded-lg bg-white border border-slate-300 font-bold text-slate-700 text-xs flex items-center justify-center hover:bg-slate-100"
                          >
                            –
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={draft.predicted_goals_rival}
                            onChange={(e) =>
                              updateMemberDraft(
                                profile.id,
                                'predicted_goals_rival',
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-9 h-8 rounded-lg bg-white border border-slate-300 text-center font-bold text-sm text-slate-900"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateMemberDraft(
                                profile.id,
                                'predicted_goals_rival',
                                draft.predicted_goals_rival + 1
                              )
                            }
                            className="w-7 h-7 rounded-lg bg-white border border-slate-300 font-bold text-slate-700 text-xs flex items-center justify-center hover:bg-slate-100"
                          >
                            +
                          </button>
                        </div>

                        {/* Comodí JoQuer */}
                        <button
                          type="button"
                          title="Comodí JoQuer (3pts + gols totals si és marcador exacte)"
                          onClick={() => updateMemberDraft(profile.id, 'is_joker', !draft.is_joker)}
                          className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                            draft.is_joker
                              ? 'bg-violet-100 border-violet-300 text-violet-600'
                              : 'bg-white border-slate-300 text-slate-300 hover:text-slate-400'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-slate-400 italic">
                        No va participar
                      </span>
                    )}
                  </div>
                );
              })}

              {feedback && (
                <div
                  className={`p-3.5 rounded-2xl text-xs font-bold ${
                    feedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {feedback.text}
                </div>
              )}

              <button
                type="button"
                onClick={handleSaveAllBets}
                disabled={saving}
                className="w-full h-10 rounded-2xl bg-barca-blue hover:bg-barca-blue-light text-white font-bold text-sm shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 mt-3"
              >
                {saving ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                <span>GUARDAR TOTES LES APOSTES I RECALCULAR PUNTS</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
