'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export default function DebugSession() {
  const [userId, setUserId] = useState<string | null>(null);
  const [origin, setOrigin] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
    const load = async () => {
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    load();
  }, []);

  // Affiche uniquement en production
  if (process.env.NODE_ENV !== 'production') return null;

  const isConnected = !!userId;
  return (
    <div className="mb-4 flex items-center gap-4 p-3 rounded-lg border border-slate-700 bg-slate-900">
      <span className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
      <div className="text-sm text-slate-300">
        <div><strong>User ID:</strong> {userId || 'Non connecté'}</div>
        <div><strong>Origin:</strong> {origin}</div>
      </div>
    </div>
  );
}
