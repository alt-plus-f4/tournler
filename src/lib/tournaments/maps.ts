/**
 * Current CS2 active-duty map pool (console map names). Update here when Valve rotates the pool.
 * Images from https://github.com/ghostcap-gaming/cs2-map-images (`public/maps/`) — note their
 * actual file formats don't all match what their names in that repo suggest (some are WebP/JPEG
 * despite a `.png`-looking source), so the extensions here are each map's real format, not a
 * guess.
 */
export const ACTIVE_DUTY_MAPS = [
	{ id: 'de_dust2', name: 'Dust II', image: '/maps/de_dust2.jpg' },
	{ id: 'de_mirage', name: 'Mirage', image: '/maps/de_mirage.webp' },
	{ id: 'de_inferno', name: 'Inferno', image: '/maps/de_inferno.png' },
	{ id: 'de_nuke', name: 'Nuke', image: '/maps/de_nuke.jpg' },
	{ id: 'de_overpass', name: 'Overpass', image: '/maps/de_overpass.webp' },
	{ id: 'de_ancient', name: 'Ancient', image: '/maps/de_ancient.webp' },
	{ id: 'de_anubis', name: 'Anubis', image: '/maps/de_anubis.jpg' },
] as const;

export type ActiveDutyMapId = (typeof ACTIVE_DUTY_MAPS)[number]['id'];

export function getMapDisplayName(mapId: string): string {
	return ACTIVE_DUTY_MAPS.find((m) => m.id === mapId)?.name ?? mapId;
}

export function getMapImage(mapId: string): string | null {
	return ACTIVE_DUTY_MAPS.find((m) => m.id === mapId)?.image ?? null;
}
