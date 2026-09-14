'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/lib/hooks/use-toast';
import EditNewsDialog, { NewsPostDefinition } from '@/components/EditNewsDialog';
import { Tournament } from '@/types/types';

interface HomepageSettings {
	featuredSource: 'TOURNAMENTS' | 'NEWS' | 'MIXED';
	featuredLayout: 'GRID' | 'CAROUSEL';
}

export default function FeaturedClient() {
	const [settings, setSettings] = useState<HomepageSettings | null>(null);
	const [isSavingSettings, setIsSavingSettings] = useState(false);

	const [tournaments, setTournaments] = useState<Tournament[]>([]);
	const [isLoadingTournaments, setIsLoadingTournaments] = useState(true);
	const [savingTournamentId, setSavingTournamentId] = useState<number | null>(null);

	const [posts, setPosts] = useState<NewsPostDefinition[]>([]);
	const [isLoadingPosts, setIsLoadingPosts] = useState(true);
	const [editingPost, setEditingPost] = useState<NewsPostDefinition | null>(null);
	const [isCreatingPost, setIsCreatingPost] = useState(false);
	const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);

	const { toast } = useToast();

	useEffect(() => {
		fetch('/api/admin/homepage-settings')
			.then((r) => r.json())
			.then((data) => setSettings(data.settings ?? { featuredSource: 'TOURNAMENTS', featuredLayout: 'GRID' }))
			.catch((e) => console.error('Failed to load homepage settings', e));

		fetch('/api/tournaments?status=ACTIVE&limit=100')
			.then((r) => r.json())
			.then((data) => setTournaments(Array.isArray(data) ? data : []))
			.catch((e) => console.error('Failed to load tournaments', e))
			.finally(() => setIsLoadingTournaments(false));

		fetch('/api/admin/news')
			.then((r) => r.json())
			.then((data) => setPosts(data.posts ?? []))
			.catch((e) => console.error('Failed to load news posts', e))
			.finally(() => setIsLoadingPosts(false));
	}, []);

	const saveSettings = async (next: HomepageSettings) => {
		setSettings(next);
		setIsSavingSettings(true);
		try {
			const response = await fetch('/api/admin/homepage-settings', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(next),
			});
			if (!response.ok) throw new Error('Failed to save');
			toast({ title: 'Homepage layout updated' });
		} catch (error) {
			console.error('Failed to save homepage settings', error);
			toast({ variant: 'destructive', title: 'Could not save homepage layout' });
		} finally {
			setIsSavingSettings(false);
		}
	};

	const updateTournament = async (tournament: Tournament, changes: { isFeatured?: boolean; featuredOrder?: number | null }) => {
		setTournaments((prev) => prev.map((t) => (t.id === tournament.id ? { ...t, ...changes } : t)));
		setSavingTournamentId(tournament.id);
		try {
			const response = await fetch(`/api/tournaments/${tournament.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(changes),
			});
			if (!response.ok) throw new Error('Failed to save');
		} catch (error) {
			console.error('Failed to update tournament', error);
			toast({ variant: 'destructive', title: 'Could not update tournament' });
		} finally {
			setSavingTournamentId(null);
		}
	};

	const openCreatePost = () => {
		setEditingPost(null);
		setIsCreatingPost(true);
		setIsPostDialogOpen(true);
	};

	const openEditPost = (post: NewsPostDefinition) => {
		setEditingPost(post);
		setIsCreatingPost(false);
		setIsPostDialogOpen(true);
	};

	const handleSavePost = (post: NewsPostDefinition) => {
		setPosts((prev) => {
			const exists = prev.some((p) => p.id === post.id);
			return exists ? prev.map((p) => (p.id === post.id ? post : p)) : [post, ...prev];
		});
	};

	const handleDeletePost = (postId: number) => {
		setPosts((prev) => prev.filter((p) => p.id !== postId));
	};

	if (!settings) {
		return (
			<div className='mx-12 mt-12 w-[80%] space-y-4'>
				<Skeleton className='h-24 w-full bg-neutral-900' />
				<Skeleton className='h-48 w-full bg-neutral-900' />
			</div>
		);
	}

	return (
		<div className='mx-12 mt-12 mb-12 w-[80%] space-y-10'>
			<div>
				<h1 className='text-2xl font-bold mb-1'>Featured Content</h1>
				<p className='text-muted-foreground text-sm'>Control what shows in the homepage&apos;s Featured section, and how it&apos;s displayed.</p>
			</div>

			{/* Homepage layout */}
			<section className='space-y-4 rounded-lg border border-white/10 p-5'>
				<h2 className='text-lg font-semibold'>Homepage Layout</h2>
				<div className='grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg'>
					<div className='space-y-2'>
						<Label>Content source</Label>
						<Select value={settings.featuredSource} onValueChange={(value) => saveSettings({ ...settings, featuredSource: value as HomepageSettings['featuredSource'] })} disabled={isSavingSettings}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='TOURNAMENTS'>Tournaments</SelectItem>
								<SelectItem value='NEWS'>News</SelectItem>
								<SelectItem value='MIXED'>Both</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className='space-y-2'>
						<Label>Display style</Label>
						<Select value={settings.featuredLayout} onValueChange={(value) => saveSettings({ ...settings, featuredLayout: value as HomepageSettings['featuredLayout'] })} disabled={isSavingSettings}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='GRID'>Grid</SelectItem>
								<SelectItem value='CAROUSEL'>Carousel</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
			</section>

			{/* Featured tournaments */}
			<section className='space-y-4'>
				<h2 className='text-lg font-semibold'>Featured Tournaments</h2>
				<p className='text-sm text-muted-foreground -mt-2'>Only upcoming/ongoing tournaments can be featured. Leave unchecked to fall back to automatic selection by prize pool.</p>
				{isLoadingTournaments ? (
					<div className='space-y-2'>
						{Array.from({ length: 4 }).map((_, i) => (
							<Skeleton key={i} className='h-14 w-full bg-neutral-900' />
						))}
					</div>
				) : tournaments.length === 0 ? (
					<div className='text-center py-12 text-muted-foreground border border-white/10 rounded-lg'>No upcoming or ongoing tournaments.</div>
				) : (
					<div className='divide-y divide-white/10 border border-white/10 rounded-lg'>
						{tournaments.map((tournament) => (
							<div key={tournament.id} className='flex items-center gap-4 p-3'>
								<label className='flex items-center gap-2 cursor-pointer shrink-0'>
									<Checkbox
										checked={tournament.isFeatured}
										onCheckedChange={(checked) => updateTournament(tournament, { isFeatured: checked === true })}
										disabled={savingTournamentId === tournament.id}
									/>
									<span className='text-sm'>Featured</span>
								</label>
								<span className='flex-1 min-w-0 truncate font-medium'>{tournament.name}</span>
								<div className='flex items-center gap-2 shrink-0'>
									<Label className='text-xs text-muted-foreground'>Order</Label>
									<Input
										type='number'
										defaultValue={tournament.featuredOrder ?? ''}
										onBlur={(e) => updateTournament(tournament, { featuredOrder: e.target.value === '' ? null : Number(e.target.value) })}
										className='h-8 w-16'
										placeholder='—'
									/>
								</div>
							</div>
						))}
					</div>
				)}
			</section>

			{/* News posts */}
			<section className='space-y-4'>
				<div className='flex items-center justify-between'>
					<h2 className='text-lg font-semibold'>News Posts</h2>
					<Button onClick={openCreatePost}>Create Post</Button>
				</div>
				{isLoadingPosts ? (
					<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
						{Array.from({ length: 3 }).map((_, i) => (
							<Skeleton key={i} className='h-24 w-full bg-neutral-900' />
						))}
					</div>
				) : posts.length === 0 ? (
					<div className='text-center py-12 text-muted-foreground border border-white/10 rounded-lg'>No news posts yet. Create your first one.</div>
				) : (
					<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
						{posts.map((post) => (
							<button key={post.id} onClick={() => openEditPost(post)} className='flex flex-col gap-2 rounded-lg border border-white/10 p-4 text-left hover:border-white/30 transition-colors'>
								<div className='flex items-center gap-2'>
									<p className='font-semibold truncate flex-1'>{post.title}</p>
									{post.isFeatured && <span className='shrink-0 rounded-full border border-white/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground'>Featured</span>}
								</div>
								<div className='prose prose-sm prose-invert max-w-none line-clamp-2 text-sm text-muted-foreground [&_*]:text-inherit' dangerouslySetInnerHTML={{ __html: post.blurb }} />
							</button>
						))}
					</div>
				)}
			</section>

			<EditNewsDialog post={isCreatingPost ? null : editingPost} isOpen={isPostDialogOpen} onClose={() => setIsPostDialogOpen(false)} onSave={handleSavePost} onDelete={handleDeletePost} />
		</div>
	);
}
