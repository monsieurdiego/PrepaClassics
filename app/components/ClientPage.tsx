"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase as sharedSupabase } from "../supabase";
import NavBar from "./NavBar";
import AuthModal from "./AuthModal";
import ExerciseList from "./ExerciseList";

interface ClientPageProps {
  initialExercises: any[];
}

export default function ClientPage({ initialExercises }: ClientPageProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [progressMap, setProgressMap] = useState<Record<number, number>>({}); // exercise_id -> count done
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadProgress = async () => {
      if (!sharedSupabase) return;
      const { data: { user } } = await sharedSupabase.auth.getUser();
      const uid = user?.id || null;
      setUserId(uid);
      if (!uid) return;
      const ids = initialExercises.map(e => e.id);
      if (!ids.length) return;
      const { data } = await sharedSupabase
        .from('user_progress')
        .select('exercise_id,index,status')
        .eq('user_id', uid)
        .in('exercise_id', ids);
      const map: Record<number, number> = {};
      (data || []).forEach((row: any) => {
        if (row.status === 'done') {
          map[row.exercise_id] = (map[row.exercise_id] || 0) + 1;
        }
      });
      setProgressMap(map);
    };
    loadProgress();
  }, [initialExercises]);

  const refreshProgress = async () => {
    if (!sharedSupabase) return;
    const { data: { user } } = await sharedSupabase.auth.getUser();
    const uid = user?.id || null;
    if (!uid) return;
    const ids = initialExercises.map(e => e.id);
    if (!ids.length) return;
    const { data } = await sharedSupabase
      .from('user_progress')
      .select('exercise_id,index,status')
      .eq('user_id', uid)
      .in('exercise_id', ids);
    const map: Record<number, number> = {};
    (data || []).forEach((row: any) => {
      if (row.status === 'done') {
        map[row.exercise_id] = (map[row.exercise_id] || 0) + 1;
      }
    });
    setProgressMap(map);
  };

  // Mise à jour immédiate sans requête, pour réactivité
  const onProgressChangeImmediate = (exerciseId: number, index: number, status: 'todo' | 'review' | 'done') => {
    setProgressMap((prev) => {
      const next = { ...prev };
      if (status === 'done') {
        next[exerciseId] = (next[exerciseId] || 0) + 1;
      } else {
        // Si on sort de "done", décrémente
        const current = next[exerciseId] || 0;
        if (current > 0) next[exerciseId] = current - 1;
      }
      return next;
    });
  };

  const totals = useMemo(() => {
    const totalBubbles = initialExercises.reduce((acc, e: any) => acc + (e.exercise_count || 0), 0);
    const totalDone = initialExercises.reduce((acc, e: any) => acc + (progressMap[e.id] || 0), 0);
    return { totalBubbles, totalDone };
  }, [initialExercises, progressMap]);

  const chapterTotals = useMemo(() => {
    const byChapter: Record<string, { bubbles: number; done: number }> = {};
    initialExercises.forEach((e: any) => {
      const ch = e.chapter || 'Autre';
      if (!byChapter[ch]) byChapter[ch] = { bubbles: 0, done: 0 };
      byChapter[ch].bubbles += (e.exercise_count || 0);
      byChapter[ch].done += (progressMap[e.id] || 0);
    });
    return byChapter;
  }, [initialExercises, progressMap]);

  // Totaux par chapitre et par niveau (Sup / Spé)
  const chapterLevelTotals = useMemo(() => {
    const normalizeNiveau = (niv?: string) => {
      if (!niv) return '';
      const s = niv.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
      if (s.startsWith('sup')) return 'sup';
      if (s.startsWith('spe')) return 'spe';
      return '';
    };
    const result: Record<string, { sup: { bubbles: number; done: number }; spe: { bubbles: number; done: number } }> = {};
    initialExercises.forEach((e: any) => {
      const ch = e.chapter || 'Autre';
      if (!result[ch]) result[ch] = { sup: { bubbles: 0, done: 0 }, spe: { bubbles: 0, done: 0 } };
      const bucket = normalizeNiveau(e.niveau);
      if (bucket === 'sup' || bucket === 'spe') {
        result[ch][bucket].bubbles += (e.exercise_count || 0);
        result[ch][bucket].done += (progressMap[e.id] || 0);
      }
    });
    return result;
  }, [initialExercises, progressMap]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-8">
      <div className="max-w-6xl mx-auto">
        {/* 1. La Barre de Navigation (Elle ouvre le modal) */}
        <NavBar onLoginClick={() => setIsModalOpen(true)} />

        {/* 2. Le Titre du site */}
        <header className="mb-12 text-center pt-4">
          <h1 className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 mb-6 tracking-tight">
            PrepaClassics
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            La sélection des exercices incontournables pour les concours.
          </p>
          {/* Barre de progression globale */}
          <div className="mt-6 max-w-2xl mx-auto text-left">
            <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
              <span>Progression globale</span>
              <span>{totals.totalBubbles ? Math.round((totals.totalDone / totals.totalBubbles) * 100) : 0}%</span>
            </div>
            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-3 bg-emerald-500"
                style={{ width: `${totals.totalBubbles ? (totals.totalDone / totals.totalBubbles) * 100 : 0}%` }}
              />
            </div>
            {/* Progression par chapitre */}
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {Object.entries(chapterTotals).map(([ch, vals]) => (
                <div key={ch} className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>{ch}</span>
                    <span>{vals.bubbles ? Math.round((vals.done / vals.bubbles) * 100) : 0}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-2 bg-blue-500"
                      style={{ width: `${vals.bubbles ? (vals.done / vals.bubbles) * 100 : 0}%` }}
                    />
                  </div>
                  {/* Détails Sup / Spé pour ce chapitre */}
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {['Sup','Spé'].map(level => {
                      const seg = level === 'Sup' ? chapterLevelTotals[ch]?.sup : chapterLevelTotals[ch]?.spe;
                      const pct = seg && seg.bubbles ? Math.round((seg.done / seg.bubbles) * 100) : 0;
                      return (
                        <div key={level} className="text-xs">
                          <div className="flex items-center justify-between text-slate-400 mb-1">
                            <span>{level}</span>
                            <span>{pct}%</span>
                          </div>
                          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-2 ${level === 'Sup' ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </header>

        {/* 3. La liste des exercices */}
        <ExerciseList initialExercises={initialExercises} onProgressChange={refreshProgress} onProgressChangeImmediate={onProgressChangeImmediate} />

        {/* 4. Le MODAL DE CONNEXION */}
        <AuthModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
        />

        {/* Pied de page */}
        <footer className="mt-20 border-t border-slate-800 pt-8 text-center text-slate-500 text-sm">
          <p>Données issues du site de Jean-Louis Rouget (Dupuy de Lôme).</p>
        </footer>

      </div>
    </div>
  );
}
