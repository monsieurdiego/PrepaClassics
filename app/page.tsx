// app/page.tsx (CORRECTION)



import { supabase } from "./supabase";
import ClientPage from "./components/ClientPage";

// Le composant principal gère la récupération des données
export default async function Home() {
  // Récupération des données côté serveur
  const { data: exercises } = await supabase
    .from('exercises')
    .select('*')
    .order('title', { ascending: true });

  return <ClientPage initialExercises={exercises || []} />;
}

// ...existing code...


// ...le composant ClientPage est maintenant importé...