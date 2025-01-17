'use server'

import { revalidatePath } from 'next/cache'

export async function revalidateTournamentPage(tournamentId: number) {
  revalidatePath(`/tournaments/${tournamentId}`)
}