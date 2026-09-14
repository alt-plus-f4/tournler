/** Current CS2 active-duty map pool (console map names). Update here when Valve rotates the pool. */
export const ACTIVE_DUTY_MAPS = [
	{ id: 'de_dust2', name: 'Dust II' },
	{ id: 'de_mirage', name: 'Mirage' },
	{ id: 'de_inferno', name: 'Inferno' },
	{ id: 'de_nuke', name: 'Nuke' },
	{ id: 'de_overpass', name: 'Overpass' },
	{ id: 'de_ancient', name: 'Ancient' },
	{ id: 'de_anubis', name: 'Anubis' },
] as const;

export type ActiveDutyMapId = (typeof ACTIVE_DUTY_MAPS)[number]['id'];

export function getMapDisplayName(mapId: string): string {
	return ACTIVE_DUTY_MAPS.find((m) => m.id === mapId)?.name ?? mapId;
}
