// app/page.tsx (CORRECTION)



import { supabase } from "./supabase";
import ClientPage from "./components/ClientPage";

// Le composant principal gère la récupération des données
export default async function Home() {
  // Récupération des données côté serveur
  let exercises = [];
  if (!supabase) {
    console.warn('Supabase non initialisé : variables d\'environnement manquantes.');
    return <ClientPage initialExercises={[]} />;
  }
  try {
    const { data } = await supabase
      .from('exercises')
      .select('*')
      .order('title', { ascending: true });
    exercises = data || [];
  } catch (err) {
    console.warn('Erreur lors de la récupération des exercices Supabase :', err);
    exercises = [];
  }
  return <ClientPage initialExercises={exercises} />;
}

// ...existing code...


// ...le composant ClientPage est maintenant importé...