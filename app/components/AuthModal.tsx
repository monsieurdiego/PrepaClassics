'use client';

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../supabase';

// Définition des propriétés que le composant recevra (ouvert/fermé)
interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [loadingCheckout, setLoadingCheckout] = useState(false);

  // Récupère l'utilisateur connecté
  useEffect(() => {
    if (!isOpen || !supabase) return;
    if (!supabase) return;
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data?.user);
      if (data?.user?.email && supabase) {
        // Vérifie le statut premium dans Supabase
        const { data: userData } = await supabase
          .from('users')
          .select('is_premium')
          .eq('email', data.user.email)
          .single();
        setIsPremium(!!userData?.is_premium);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        onClose();
        router.refresh();
      }
    });
    return () => subscription.unsubscribe();
  }, [isOpen, onClose, router]);

  // Si le modal n'est pas ouvert, on n'affiche rien
  if (!isOpen) return null;
  if (!supabase) return <p>Erreur config Supabase : variables d'environnement manquantes.</p>;

  // Fonction pour lancer Stripe Checkout
  const handleCheckout = async () => {
    setLoadingCheckout(true);
    const res = await fetch('/api/create-stripe-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user?.email }),
    });
    const { url } = await res.json();
    window.location.href = url;
    setLoadingCheckout(false);
  };


  return (
    // Conteneur de fond semi-transparent (Overlay)
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4 transition-opacity"
      onClick={onClose} // Ferme si on clique en dehors du formulaire
    >
      {/* Conteneur du formulaire Modal */}
      <div 
        className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-300 relative"
        onClick={(e) => e.stopPropagation()} // Empêche la fermeture si on clique sur le formulaire
      >
        <div className="flex justify-between items-center mb-6">
          <div className="text-center w-full">
            <h1 className="text-3xl font-bold text-white mb-2">Connecte-toi </h1>
            <p className="text-slate-400">Accède à ton suivi de progression.</p>
          </div>
          {/* Bouton de fermeture */}
          <button 
            onClick={onClose}
            className="ml-2 text-slate-500 hover:text-white text-2xl font-bold"
            aria-label="Fermer le modal"
          >
            &times;
          </button>
        </div>

        {/* Le formulaire Supabase Auth UI */}
        {supabase && (
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#2563eb',
                    brandAccent: '#1d4ed8',
                    inputText: 'white',
                    inputBackground: '#1e293b',
                    inputLabelText: '#94a3b8',
                  },
                },
              },
            }}
            providers={[]}
            theme="dark"
            redirectTo={undefined} // On gère la redirection nous-mêmes dans useEffect
            localization={{
              variables: {
                sign_in: {
                  email_label: 'Adresse email',
                  password_label: 'Mot de passe',
                  button_label: 'Se connecter',
                },
                sign_up: {
                  email_label: 'Adresse email',
                  password_label: 'Créer un mot de passe',
                  button_label: "S'inscrire",
                  link_text: "Pas de compte ? Créer un compte",
                },
              },
            }}
          />
        )}
        {/* Bouton Stripe Checkout si non premium */}
        {!isPremium && user && (
          <button
            className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={handleCheckout}
            disabled={loadingCheckout}
          >
            {loadingCheckout ? 'Redirection...' : 'Passer Premium'}
          </button>
        )}
        {/* Message premium si déjà abonné */}
        {isPremium && (
          <div className="mt-6 text-green-400 text-center font-bold">Tu es déjà premium !</div>
        )}
      </div>
    </div>
  );
}
