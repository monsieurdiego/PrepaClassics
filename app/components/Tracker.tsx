'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';

interface TrackerProps {
  exerciseId: string | number;
  totalExos?: number;
}

export default function Tracker({ exerciseId, totalExos = 1 }: TrackerProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [doneSet, setDoneSet] = useState<Set<number>>(new Set());
  const exoIdNum = useMemo(() => (typeof exerciseId === 'string' ? parseInt(exerciseId, 10) : exerciseId), [exerciseId]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted) return;
      setUserId(user?.id || null);
      if (user && exoIdNum) {
        const { data, error } = await supabase
          .from('user_progress')
          .select('index,status')
          .eq('exercise_ref', exoIdNum);
        if (!error && data) {
          const next = new Set<number>();
          data.forEach((row: any) => {
            if ((row.status || 'todo') === 'done') next.add(row.index as number);
          });
          setDoneSet(next);
        }
      }
    };
    load();
    return () => { mounted = false; };
  }, [exoIdNum]);

  const toggleExercise = async (index: number) => {
    if (!supabase || !exoIdNum) return;
    const isDone = doneSet.has(index);
    // UI optimiste
    setDoneSet(prev => {
      const next = new Set(prev);
      if (isDone) next.delete(index); else next.add(index);
      return next;
    });

    if (!userId) {
      // Pas connecté: rollback visuel après court délai
      setTimeout(() => {
        setDoneSet(prev => {
          const next = new Set(prev);
          if (!isDone) next.delete(index); else next.add(index);
          return next;
        });
      }, 300);
      return;
    }

    try {
      if (isDone) {
        // Supprime l'entrée 'done' pour cet index
        const { error } = await supabase
          .from('user_progress')
          .delete()
          .eq('exercise_ref', exoIdNum)
          .eq('index', index)
          .eq('status', 'done');
        if (error) throw error;
      } else {
        // Insère/Upsert en 'done' pour cet index
        const { error } = await supabase
          .from('user_progress')
          .upsert({ exercise_ref: exoIdNum, index, status: 'done' });
        if (error) throw error;
      }
    } catch (err) {
      // rollback si échec
      setDoneSet(prev => {
        const next = new Set(prev);
        if (isDone) next.add(index); else next.delete(index);
        return next;
      });
      console.error('Erreur persistance progression:', err);
    }
  };

  const count = Math.max(1, Number.isFinite(totalExos as number) ? (totalExos as number) : 1);

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {Array.from({ length: count }, (_, i) => i + 1).map((idx) => {
        const isDone = doneSet.has(idx);
        const cls = isDone
          ? 'bg-green-600 border-green-700 text-white'
          : 'bg-slate-800 border-slate-700 text-slate-300';
        return (
          <button
            key={idx}
            onClick={() => toggleExercise(idx)}
            className={`w-8 h-8 rounded-full border text-xs font-bold ${cls}`}
            title={`Exercice ${idx} — ${isDone ? 'done' : 'todo'}`}
          >
            {idx}
          </button>
        );
      })}
    </div>
  );
}
