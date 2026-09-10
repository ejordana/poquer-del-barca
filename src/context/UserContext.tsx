'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile, FAMILY_MEMBERS } from '@/types/database';

interface UserContextType {
  currentUser: Profile | null;
  profiles: Profile[];
  loading: boolean;
  selectUser: (profile: Profile) => void;
  clearUser: () => void;
  isSelectorOpen: boolean;
  setIsSelectorOpen: (open: boolean) => void;
  isAdmin: boolean;
  refreshProfiles: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// Perfils per defecte (per si la base de dades encara s'està inicialitzant)
const DEFAULT_PROFILES: Profile[] = FAMILY_MEMBERS.map((name, idx) => ({
  id: `default-${idx + 1}`,
  nom: name,
  avatar_color: idx % 2 === 0 ? '#A50044' : '#004D98',
  is_admin: name === 'Xavier',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}));

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>(DEFAULT_PROFILES);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  const supabase = createClient();

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('nom', { ascending: true });

      if (!error && data && data.length > 0) {
        const list = data as Profile[];
        setProfiles(list);

        // Si tenim un usuari guardat a localStorage, recuperar-lo de la llista actualitzada.
        // Comparem primer per id i, si no hi ha coincidència (id antic d'un seed/perfil
        // provisional anterior), per nom — que és UNIQUE a la BD. Així recuperem el perfil
        // real i corregim l'id desat perquè les porres es lliguin correctament.
        const savedId = typeof window !== 'undefined' ? localStorage.getItem('porres_user_id') : null;
        const savedName = typeof window !== 'undefined' ? localStorage.getItem('porres_user_name') : null;
        if (savedId || savedName) {
          const found =
            list.find((p) => p.id === savedId) || list.find((p) => p.nom === savedName);
          if (found) {
            setCurrentUser(found);
            if (typeof window !== 'undefined') {
              localStorage.setItem('porres_user_id', found.id);
              localStorage.setItem('porres_user_name', found.nom);
            }
            return;
          }
        }
      }
    } catch (err) {
      console.error('Error carregant perfils:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Mirar si tenim un usuari a localStorage
    const savedId = typeof window !== 'undefined' ? localStorage.getItem('porres_user_id') : null;
    const savedName = typeof window !== 'undefined' ? localStorage.getItem('porres_user_name') : null;

    if (savedId && savedName) {
      const localProfile: Profile = {
        id: savedId,
        nom: savedName,
        is_admin: savedName === 'Xavier',
        avatar_color: '#004D98',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setCurrentUser(localProfile);
    } else {
      // Si no hi ha ningú seleccionat, obrir el selector
      setIsSelectorOpen(true);
    }

    fetchProfiles();
  }, []);

  const selectUser = (profile: Profile) => {
    setCurrentUser(profile);
    setIsSelectorOpen(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('porres_user_id', profile.id);
      localStorage.setItem('porres_user_name', profile.nom);
    }
  };

  const clearUser = () => {
    setCurrentUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('porres_user_id');
      localStorage.removeItem('porres_user_name');
    }
    setIsSelectorOpen(true);
  };

  return (
    <UserContext.Provider
      value={{
        currentUser,
        profiles,
        loading,
        selectUser,
        clearUser,
        isSelectorOpen,
        setIsSelectorOpen,
        isAdmin: currentUser?.is_admin || currentUser?.nom === 'Xavier',
        refreshProfiles: fetchProfiles,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser s’ha d’utilitzar dins d’un UserProvider');
  }
  return context;
}
