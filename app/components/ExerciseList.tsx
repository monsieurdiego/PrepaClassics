'use client'; // Indique que c'est un composant interactif

import { useState, useMemo } from 'react';
import { supabase } from '../supabase';
import { useEffect } from 'react';




export default function ExerciseList({ initialExercises, onProgressChange }: { initialExercises: any[]; onProgressChange?: () => void }) {
  // Typage strict des catégories
  type FixedCategory = "Algèbre Sup" | "Algèbre Spé" | "Analyse Sup" | "Analyse Spé" | "Probas Sup" | "Probas Spé" | "Oraux";
  const [selectedCategory, setSelectedCategory] = useState<FixedCategory | null>(null);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userProgress, setUserProgress] = useState<Record<string, 'todo' | 'done' | 'review'>>({});
  const [userId, setUserId] = useState<string | null>(null);

  // Récupère l'utilisateur et le statut premium
  useEffect(() => {
    const getUser = async () => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseAnonKey) return;
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email || null);
      setUserId(user?.id || null);
      if (user?.email) {
        const { data: userData } = await supabase
          .from('users')
          .select('is_premium')
          .eq('email', user.email)
          .single();
        setIsPremium(!!userData?.is_premium);

        // Charger le progrès utilisateur pour les exercices visibles
        const ids = initialExercises.map((e) => e.id);
        if (ids.length) {
          const { data: progress } = await supabase
            .from('user_progress')
            .select('exercise_id,index,status')
            .in('exercise_id', ids);
          const map: Record<string, 'todo' | 'done' | 'review'> = {};
          (progress || []).forEach((p: any) => {
            map[`${p.exercise_id}:${p.index}`] = (p.status as 'todo' | 'done' | 'review') || 'todo';
          });
          setUserProgress(map);
        }
      }
    };
    getUser();
  }, []);


  // Catégories fixes demandées
  // Ordre demandé: tous les Sup, puis tous les Spé, puis Oraux
  const categories: FixedCategory[] = [
    "Algèbre Sup",
    "Analyse Sup",
    "Probas Sup",
    "Algèbre Spé",
    "Analyse Spé",
    "Probas Spé",
    "Oraux"
  ];

  // Filtre selon la catégorie sélectionnée

  // Filtrage selon la catégorie sélectionnée
  const filteredExercises = initialExercises.filter((exo) => {
    if (!selectedCategory) return true;
    if (selectedCategory === "Oraux") {
      return exo.niveau === "Oral";
    }
    // Catégories combinées
    const mapping = {
      "Algèbre Sup": exo.chapter === "Algèbre" && exo.niveau === "Sup",
      "Algèbre Spé": exo.chapter === "Algèbre" && exo.niveau === "Spé",
      "Analyse Sup": exo.chapter === "Analyse" && exo.niveau === "Sup",
      "Analyse Spé": exo.chapter === "Analyse" && exo.niveau === "Spé",
      "Probas Sup": (exo.chapter === "Probas" || exo.chapter === "Probabilités") && exo.niveau === "Sup",
      "Probas Spé": (exo.chapter === "Probas" || exo.chapter === "Probabilités") && exo.niveau === "Spé",
    };
    return mapping[selectedCategory as keyof typeof mapping] === true;
  }).sort((a: any, b: any) => {
    const order: Record<string, number> = { 'Sup': 0, 'Spé': 1, 'Oral': 2 };
    const ao = order[a.niveau] ?? 99;
    const bo = order[b.niveau] ?? 99;
    if (ao !== bo) return ao - bo;
    // Ensuite par chapitre puis titre
    const ach = (a.chapter || '').localeCompare(b.chapter || '');
    if (ach !== 0) return ach;
    return (a.title || '').localeCompare(b.title || '');
  });

  const toggleBubble = async (exerciseId: number, index: number) => {
    const key = `${exerciseId}:${index}`;
    const current = userProgress[key] || 'todo';
    // Nouveau cycle: todo -> review (jaune) -> done (vert) -> todo (gris)
    const next: 'todo' | 'done' | 'review' = current === 'todo' ? 'review' : current === 'review' ? 'done' : 'todo';
    setUserProgress((prev) => ({ ...prev, [key]: next }));

    // Persistance côté Supabase
    try {
      if (supabase && userId) {
        await supabase
          .from('user_progress')
          .upsert({ exercise_id: exerciseId, index, status: next })
          .select();
        // Rafraîchir les barres en haut
        onProgressChange && onProgressChange();
      }
    } catch (err) {
      // rollback simple en cas d’échec
      setUserProgress((prev) => ({ ...prev, [key]: current }));
    }
  };

  return (
    <div>
      {/* --- BOUTONS DE TRI (Catégories fixes) --- */}
      <div className="mb-10 flex flex-wrap gap-2">
        {categories.map(cat => {
          const isSup = cat.includes('Sup');
          const isSpe = cat.includes('Spé');
          const isOraux = cat === 'Oraux';
          const base = isSup
            ? (selectedCategory === cat ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-slate-900 text-emerald-400 border-slate-700 hover:bg-emerald-950 hover:text-white')
            : isSpe
            ? (selectedCategory === cat ? 'bg-blue-600 text-white border-blue-700' : 'bg-slate-900 text-blue-400 border-slate-700 hover:bg-blue-950 hover:text-white')
            : isOraux
            ? (selectedCategory === cat ? 'bg-red-600 text-white border-red-700' : 'bg-slate-900 text-red-400 border-slate-700 hover:bg-red-950 hover:text-white')
            : (selectedCategory === cat ? 'bg-slate-700 text-white border-slate-800' : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white');
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-3 rounded-xl font-bold border transition-all ${base}`}
            >
              {cat}
            </button>
          );
        })}
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-5 py-3 rounded-xl font-bold border transition-all ${selectedCategory === null ? "bg-emerald-600 text-white border-emerald-700" : "bg-slate-900 text-emerald-400 border-slate-700 hover:bg-emerald-950 hover:text-white"}`}
        >
          Toutes catégories
        </button>
      </div>

      {/* --- RÉSULTATS --- */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredExercises.map((exo) => {
          const levelColor = exo.niveau === 'Sup'
            ? 'border-emerald-600 hover:border-emerald-500 shadow-emerald-500/10'
            : exo.niveau === 'Spé'
            ? 'border-blue-600 hover:border-blue-500 shadow-blue-500/10'
            : exo.niveau === 'Oral'
            ? 'border-red-600 hover:border-red-500 shadow-red-500/10'
            : 'border-slate-800 hover:border-slate-700 shadow-slate-700/10';
          const badgeBg = exo.niveau === 'Sup'
            ? 'bg-emerald-900 text-emerald-300 border-emerald-800'
            : exo.niveau === 'Spé'
            ? 'bg-blue-900 text-blue-300 border-blue-800'
            : exo.niveau === 'Oral'
            ? 'bg-red-900 text-red-300 border-red-800'
            : 'bg-slate-900 text-slate-300 border-slate-800';
          return (
          <div
            key={exo.id}
            className={`group bg-slate-900 border p-6 rounded-2xl shadow-lg transition-all duration-300 flex flex-col justify-between ${levelColor}`}
          >
            <div>
              <div className="mb-4">
                <span className={`inline-block text-xs px-3 py-1 rounded-full font-semibold border ${badgeBg}`}>
                  {exo.niveau === "Oral"
                    ? exo.chapter || "Maths"
                    : `${exo.chapter || "Maths"} (${exo.niveau})`}
                </span>
              </div>
              <h2 className="text-lg font-bold leading-snug text-white mb-2 group-hover:text-blue-300 transition-colors">
                {exo.title}
              </h2>
            </div>
            <div className="mt-6">
              {/* Rangée de bulles 1..N selon exercise_count */}
              {typeof exo.exercise_count === 'number' && exo.exercise_count > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {Array.from({ length: exo.exercise_count }, (_, i) => i + 1).map((idx) => {
                    const state = userProgress[`${exo.id}:${idx}`] || 'todo';
                    // Couleurs de statut distinctes des couleurs de niveau
                    const color = state === 'done'
                      ? 'bg-green-600 border-green-700 text-white'
                      : state === 'review'
                      ? 'bg-yellow-500 border-yellow-600 text-slate-900'
                      : 'bg-slate-800 border-slate-700 text-slate-300';
                    return (
                      <button
                        key={idx}
                        onClick={() => toggleBubble(exo.id, idx)}
                        className={`w-8 h-8 rounded-full border text-xs font-bold ${color}`}
                        title={`Exercice ${idx} — ${state}`}
                      >
                        {idx}
                      </button>
                    );
                  })}
                </div>
              )}
              {/* Légende des statuts */}
              <div className="mt-2 text-xs text-slate-400 flex gap-4 items-center">
                <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-500 border border-yellow-600" /> À revoir</span>
                <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-600 border border-green-700" /> Compris</span>
                <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-slate-800 border border-slate-700" /> À faire</span>
              </div>
              {/* Protection premium : si exo.premium === true et user non premium, affiche un message d'incitation */}
              {exo.is_premium && !isPremium ? (
                <div className="block w-full text-center bg-yellow-700 text-white font-medium px-4 py-3 rounded-xl transition-all shadow-md">
                  🔒 Exercice premium — <span className="underline">Abonne-toi pour débloquer</span>
                </div>
              ) : (
                <a
                  href={exo.url_enonce}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block w-full text-center font-medium px-4 py-3 rounded-xl transition-all shadow-md hover:shadow-lg ${exo.niveau === 'Sup' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : exo.niveau === 'Spé' ? 'bg-blue-600 hover:bg-blue-500 text-white' : exo.niveau === 'Oral' ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-slate-700 text-white'}`}
                >
                  📄 Voir le PDF
                </a>
              )}
            </div>
          </div>
        );})}
      </div>

      {filteredExercises.length === 0 && (
        <div className="text-center py-20 text-slate-500">
          <p className="text-xl">Aucun exercice trouvé pour cette catégorie 🕵️‍♂️</p>
          <button
            onClick={() => setSelectedCategory(null)}
            className="mt-4 text-blue-400 hover:underline"
          >
            Réinitialiser la sélection
          </button>
        </div>
      )}
    </div>
  );
}