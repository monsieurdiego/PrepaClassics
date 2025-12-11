"use client";

import { useState } from "react";
import NavBar from "./NavBar";
import AuthModal from "./AuthModal";
import ExerciseList from "./ExerciseList";

interface ClientPageProps {
  initialExercises: any[];
}

export default function ClientPage({ initialExercises }: ClientPageProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

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
        </header>

        {/* 3. La liste des exercices */}
        <ExerciseList initialExercises={initialExercises} />

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
