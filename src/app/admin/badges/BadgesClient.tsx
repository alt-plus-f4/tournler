'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BadgeIcon } from '@/lib/badge-icons';
import EditBadgeDialog, { BadgeDefinition } from '@/components/EditBadgeDialog';
import { Skeleton } from '@/components/ui/skeleton';

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
		<div className='mx-12 mt-12 w-[80%] overflow-hidden'>
			<div className='flex items-center justify-between mb-6'>
				<div>
					<h1 className='text-2xl font-bold'>Badges</h1>
					<p className='text-muted-foreground text-sm'>Create badge types and award them to players from the Users page.</p>
				</div>
				<Button onClick={openCreate}>Create Badge</Button>
			</div>

			<Input placeholder='Search badges by name or description...' value={search} onChange={(e) => setSearch(e.target.value)} className='mb-4' />

			{isLoading ? (
				<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
					{Array.from({ length: 6 }).map((_, i) => (
						<Skeleton key={i} className='h-28 w-full bg-neutral-900' />
					))}
				</div>
			) : badges.length === 0 ? (
				<div className='text-center py-24 text-muted-foreground'>No badges yet. Create your first one.</div>
			) : filteredBadges.length === 0 ? (
				<div className='text-center py-24 text-muted-foreground'>No badges match &quot;{search}&quot;.</div>
			) : (
				<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
					{filteredBadges.map((badge) => (
						<button
							key={badge.id}
							onClick={() => openEdit(badge)}
							className='flex items-start gap-3 rounded-lg border border-white/10 p-4 text-left hover:border-white/30 transition-colors'
						>
							<div className='flex h-12 w-12 shrink-0 items-center justify-center rounded-lg' style={{ backgroundColor: `${badge.color}20` }}>
								<BadgeIcon name={badge.icon} className='h-6 w-6' style={{ color: badge.color }} />
							</div>
							<div className='min-w-0 flex-1'>
								<div className='flex items-center gap-2'>
									<p className='font-semibold truncate'>{badge.name}</p>
									{badge.isOverlay && <span className='shrink-0 rounded-full border border-white/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground'>Avatar</span>}
								</div>
								{badge.description && <p className='text-sm text-muted-foreground truncate'>{badge.description}</p>}
								<p className='text-xs text-muted-foreground mt-1'>{badge._count?.awards ?? 0} awarded</p>
							</div>
						</button>
					))}
				</div>
			)}

			<EditBadgeDialog badge={isCreatingNew ? null : editingBadge} isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} onSave={handleSave} onDelete={handleDelete} />
		</div>
	);
}
