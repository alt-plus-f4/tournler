'use client';

import { useState, useEffect } from "react";

export default function useFetchUsers(teamId: number) {
    const [users, setUsers] = useState({
      withoutTeam: [],
      withTeam: [],
      requestedToJoin: [],
      alreadyInvited: [],
    });
    const [loading, setLoading] = useState(true);
  
    useEffect(() => {
      async function fetchUsers() {
        try {
          const res = await fetch(`/api/cs2/teams/${teamId}/users`);
          if (res.ok) {
            const data = await res.json();
            setUsers(data);
          }
        } catch (error) {
          console.error('Error fetching users:', error);
        } finally {
          setLoading(false);
        }
      }
      fetchUsers();
    }, [teamId]);
  
    return { users, loading };
  }