'use client'; // Indique que c'est un composant interactif

import { useState, useMemo } from 'react';
import { supabase } from '../supabase';
import { useEffect } from 'react';




export default function ExerciseList({ initialExercises }: { initialExercises: any[] }) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userProgress, setUserProgress] = useState<Record<string, 'todo' | 'done' | 'review'>>({});

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
  const categories = [
    "Algèbre Sup",
    "Algèbre Spé",
    "Analyse Sup",
    "Analyse Spé",
    "Probas Sup",
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
    return mapping[selectedCategory] === true;
  });

  const toggleBubble = async (exerciseId: number, index: number) => {
    const key = `${exerciseId}:${index}`;
    const current = userProgress[key] || 'todo';
    const next: 'todo' | 'done' | 'review' = current === 'todo' ? 'done' : current === 'done' ? 'review' : 'todo';
    setUserProgress((prev) => ({ ...prev, [key]: next }));

    // Persistance côté Supabase
    try {
      if (!supabase) return;
      await supabase
        .from('user_progress')
        .upsert({ exercise_id: exerciseId, index, status: next })
        .select();
    } catch (err) {
      // rollback simple en cas d’échec
      setUserProgress((prev) => ({ ...prev, [key]: current }));
    }
  };

  return (
    <div>
      {/* --- BOUTONS DE TRI (Catégories fixes) --- */}
      <div className="mb-10 flex flex-wrap gap-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-5 py-3 rounded-xl font-bold border transition-all ${selectedCategory === cat ? "bg-blue-600 text-white border-blue-700" : "bg-slate-900 text-blue-400 border-slate-700 hover:bg-blue-950 hover:text-white"}`}
          >
            {cat}
          </button>
        ))}
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-5 py-3 rounded-xl font-bold border transition-all ${selectedCategory === null ? "bg-emerald-600 text-white border-emerald-700" : "bg-slate-900 text-emerald-400 border-slate-700 hover:bg-emerald-950 hover:text-white"}`}
        >
          Toutes catégories
        </button>
      </div>

      {/* --- RÉSULTATS --- */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredExercises.map((exo) => (
          <div
            key={exo.id}
            className="group bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg hover:shadow-blue-500/10 hover:border-blue-500/50 transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="mb-4">
                <span className="inline-block bg-blue-950 text-blue-300 border border-blue-900 text-xs px-3 py-1 rounded-full font-semibold">
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
                    const color = state === 'done' ? 'bg-emerald-600 border-emerald-700 text-white' : state === 'review' ? 'bg-amber-600 border-amber-700 text-white' : 'bg-slate-800 border-slate-700 text-slate-300';
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
                  className="block w-full text-center bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-3 rounded-xl transition-all shadow-md hover:shadow-lg"
                >
                  📄 Voir le PDF
                </a>
              )}
            </div>
          </div>
        ))}
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