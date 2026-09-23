'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TrophyIcon } from '@/components/trophies/TrophyIcon';
import EditBadgeDialog, { BadgeDefinition } from '@/components/EditBadgeDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { adminTable as t } from '@/components/admin/table-styles';
import { cn } from '@/lib/utils';

export default function BadgesClient() {
	const [badges, setBadges] = useState<BadgeDefinition[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [editingBadge, setEditingBadge] = useState<BadgeDefinition | null>(null);
	const [isCreatingNew, setIsCreatingNew] = useState(false);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [search, setSearch] = useState('');

	const fetchBadges = async () => {
		setIsLoading(true);
		const response = await fetch('/api/admin/badges');
		const data = await response.json();
		setBadges(data.badges ?? []);
		setIsLoading(false);
	};

	useEffect(() => {
		fetchBadges();
	}, []);

	const openCreate = () => {
		setEditingBadge(null);
		setIsCreatingNew(true);
		setIsDialogOpen(true);
	};

	const openEdit = (badge: BadgeDefinition) => {
		setEditingBadge(badge);
		setIsCreatingNew(false);
		setIsDialogOpen(true);
	};

	const handleSave = (badge: BadgeDefinition) => {
		setBadges((prev) => {
			const exists = prev.some((b) => b.id === badge.id);
			return exists ? prev.map((b) => (b.id === badge.id ? { ...b, ...badge } : b)) : [{ ...badge, _count: { awards: 0 } }, ...prev];
		});
	};

	const handleDelete = (badgeId: number) => {
		setBadges((prev) => prev.filter((b) => b.id !== badgeId));
	};

	const filteredBadges = badges.filter((badge) => {
		const q = search.trim().toLowerCase();
		if (!q) return true;
		return badge.name.toLowerCase().includes(q) || (badge.description ?? '').toLowerCase().includes(q);
	});

	return (
		<div className='mx-4 mt-12 max-w-6xl md:mx-12'>
			<div className='mb-6 flex flex-wrap items-center justify-between gap-3'>
				<div>
					<h1 className='text-2xl font-bold'>Badges</h1>
					<p className='text-sm text-muted-foreground'>Create badge types here, then award them to players from the Users page.</p>
				</div>
				<Button onClick={openCreate}>Create badge</Button>
			</div>

			<Label htmlFor='admin-badge-search' className='sr-only'>
				Search badges
			</Label>
			<Input id='admin-badge-search' type='search' placeholder='Search badges by name or description…' value={search} onChange={(e) => setSearch(e.target.value)} className='mb-4' />

			<div className={t.wrapper}>
				<table className={t.table}>
					<thead className={t.thead}>
						<tr>
							<th scope='col' className={t.th}>
								Badge
							</th>
							<th scope='col' className={t.th}>
								Description
							</th>
							<th scope='col' className={t.th}>
								Shown on
							</th>
							<th scope='col' className={cn(t.th, 'text-right')}>
								Awarded
							</th>
						</tr>
					</thead>
					{isLoading ? (
						<tbody aria-hidden>
							{Array.from({ length: 4 }).map((_, i) => (
								<tr key={i} className='border-b border-border last:border-0'>
									{Array.from({ length: 4 }).map((_, j) => (
										<td key={j} className={t.td}>
											<Skeleton className='h-4 w-full bg-muted' />
										</td>
									))}
								</tr>
							))}
						</tbody>
					) : filteredBadges.length === 0 ? (
						<tbody>
							<tr>
								<td colSpan={4} className={t.empty}>
									{badges.length === 0 ? 'No badges yet. Create your first one.' : `No badges match “${search}”.`}
								</td>
							</tr>
						</tbody>
					) : (
						<tbody className={t.tbody}>
							{filteredBadges.map((badge) => (
								<tr key={badge.id} className={t.tr}>
									<td className={t.td}>
										<div className='flex items-center gap-3'>
											<TrophyIcon badge={badge} size={32} fallback='tint' decorative />
											<button type='button' onClick={() => openEdit(badge)} className={t.rowAction} aria-label={`Edit ${badge.name} badge`}>
												{badge.name}
											</button>
										</div>
									</td>
									<td className={cn(t.td, 'max-w-[40ch] truncate text-neutral-300')}>{badge.description || <span className='text-muted-foreground'>—</span>}</td>
									<td className={cn(t.td, 'whitespace-nowrap text-neutral-300')}>{badge.isOverlay ? 'Avatar' : 'Badge row'}</td>
									<td className={cn(t.td, t.num, 'text-right')}>{badge._count?.awards ?? 0}</td>
								</tr>
							))}
						</tbody>
					)}
				</table>
			</div>

			<EditBadgeDialog badge={isCreatingNew ? null : editingBadge} isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} onSave={handleSave} onDelete={handleDelete} />
		</div>
	);
}
