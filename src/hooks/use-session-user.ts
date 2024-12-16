'use client';

import { useState, useEffect } from 'react';
import { ExtendedUser } from '../lib/models/user-model';

export default function useSessionUser() {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSessionUser() {
      try {
        const res = await fetch('/api/user');
        if (res.ok) {
          const data: ExtendedUser = await res.json();
          setUser(data);
        } else {
          console.error('Failed to fetch user:', res.statusText);
        }
      } catch (error) {
        console.error('Error fetching session user:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchSessionUser();
  }, []);

  return { user, loading };
}