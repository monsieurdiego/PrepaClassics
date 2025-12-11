'use client';

import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// 👇 REMETS TES INFOS SUPABASE ICI
const supabaseUrl = 'https://anvtpyidqcykdcutiyyx.supabase.co';
const supabaseAnonKey = 'sb_publishable_SG03U_jCj1qzTXx1YjJyNw_Cx50TvkH';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface NavBarProps {
  onLoginClick: () => void; // Nouvelle fonction pour ouvrir le modal
}

export default function NavBar({ onLoginClick }: NavBarProps) {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_OUT') {
        router.refresh(); 
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <nav className="flex justify-end mb-8">
      {user ? (
        // --- SI CONNECTÉ : Affiche l'email et le bouton déconnexion ---
        <div className="flex items-center gap-4 bg-slate-900 border border-slate-700 p-2 pr-4 rounded-full shadow-md animate-in fade-in">
          <div className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/50">
            CONNECTÉ
          </div>
          <span className="text-sm text-slate-300 font-medium hidden md:inline">
            {user.email}
          </span>
          <button 
            onClick={handleLogout}
            className="text-xs text-red-400 hover:text-red-300 hover:bg-red-900/30 px-2 py-1 rounded transition-colors"
          >
            Déconnexion
          </button>
        </div>
      ) : (
        // --- SI DÉCONNECTÉ : Affiche le BOUTON qui ouvre le modal ---
        <button 
          onClick={onLoginClick} // Appel de la fonction pour ouvrir le modal
          className="group flex items-center gap-3 text-sm font-medium text-slate-400 hover:text-white transition-all bg-slate-900/50 hover:bg-slate-900 border border-transparent hover:border-slate-700 px-4 py-2 rounded-full"
        >
          <span>Se connecter / S'inscrire</span>
          <span className="bg-slate-800 group-hover:bg-blue-600 text-white p-1.5 rounded-full transition-colors">
            👤
          </span>
        </button>
      )}
    </nav>
  );
}