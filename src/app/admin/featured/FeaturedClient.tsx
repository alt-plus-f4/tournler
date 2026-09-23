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
			<div className='mx-4 mt-12 max-w-6xl md:mx-12 space-y-4'>
				<Skeleton className='h-24 w-full bg-muted' />
				<Skeleton className='h-48 w-full bg-muted' />
			</div>
		);
	}

	return (
		<div className='mx-4 mt-12 mb-12 max-w-6xl md:mx-12 space-y-10'>
			<div>
				<h1 className='text-2xl font-bold mb-1'>Featured</h1>
				<p className='text-muted-foreground text-sm'>Control what shows in the homepage&apos;s Featured section, and how it&apos;s displayed.</p>
			</div>

			{/* Homepage layout */}
			<section className='space-y-4 rounded-md border border-border p-5'>
				<h2 className='text-lg font-semibold'>Homepage layout</h2>
				<div className='grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg'>
					<div className='space-y-2'>
						<Label htmlFor='featured-source'>Content source</Label>
						<Select value={settings.featuredSource} onValueChange={(value) => saveSettings({ ...settings, featuredSource: value as HomepageSettings['featuredSource'] })} disabled={isSavingSettings}>
							<SelectTrigger id='featured-source'>
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
						<Label htmlFor='featured-layout'>Display style</Label>
						<Select value={settings.featuredLayout} onValueChange={(value) => saveSettings({ ...settings, featuredLayout: value as HomepageSettings['featuredLayout'] })} disabled={isSavingSettings}>
							<SelectTrigger id='featured-layout'>
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
				<h2 className='text-lg font-semibold'>Featured tournaments</h2>
				<p className='text-sm text-muted-foreground -mt-2'>Only upcoming/ongoing tournaments can be featured. Leave unchecked to fall back to automatic selection by prize pool.</p>
				{isLoadingTournaments ? (
					<div className='space-y-2'>
						{Array.from({ length: 4 }).map((_, i) => (
							<Skeleton key={i} className='h-14 w-full bg-muted' />
						))}
					</div>
				) : tournaments.length === 0 ? (
					<div className='text-center py-12 text-muted-foreground border border-border rounded-md'>No upcoming or ongoing tournaments.</div>
				) : (
					<div className='divide-y divide-border border border-border rounded-md'>
						{tournaments.map((tournament) => (
							<div key={tournament.id} className='flex items-center gap-4 p-3'>
								<label className='flex items-center gap-2 cursor-pointer shrink-0'>
									<Checkbox
										aria-label={`Feature ${tournament.name}`}
										checked={tournament.isFeatured}
										onCheckedChange={(checked) => updateTournament(tournament, { isFeatured: checked === true })}
										disabled={savingTournamentId === tournament.id}
									/>
									<span className='text-sm'>Featured</span>
								</label>
								<span className='flex-1 min-w-0 truncate font-medium'>{tournament.name}</span>
								<div className='flex items-center gap-2 shrink-0'>
									<Label htmlFor={`featured-order-${tournament.id}`} className='text-xs text-muted-foreground'>
										Order<span className='sr-only'> for {tournament.name}</span>
									</Label>
									<Input
										id={`featured-order-${tournament.id}`}
										type='number'
										defaultValue={tournament.featuredOrder ?? ''}
										onBlur={(e) => updateTournament(tournament, { featuredOrder: e.target.value === '' ? null : Number(e.target.value) })}
										className='h-8 w-16 font-mono tabular-nums'
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
					<h2 className='text-lg font-semibold'>News posts</h2>
					<Button variant='outline' onClick={openCreatePost}>Create post</Button>
				</div>
				{isLoadingPosts ? (
					<div className='space-y-2'>
						{Array.from({ length: 3 }).map((_, i) => (
							<Skeleton key={i} className='h-14 w-full bg-muted' />
						))}
					</div>
				) : posts.length === 0 ? (
					<div className='text-center py-12 text-muted-foreground border border-border rounded-md'>No news posts yet. Create your first one.</div>
				) : (
					<ul className='divide-y divide-border rounded-md border border-border'>
						{posts.map((post) => (
							<li key={post.id}>
								<button
									type='button'
									onClick={() => openEditPost(post)}
									aria-label={`Edit post ${post.title}`}
									className='flex w-full flex-col gap-1 p-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'
								>
									<span className='flex items-center gap-2'>
										<span className='flex-1 truncate font-medium'>{post.title}</span>
										{post.isFeatured && <span className='shrink-0 rounded-sm border border-border px-1.5 py-0.5 text-xs font-bold uppercase tracking-widest text-muted-foreground'>Featured</span>}
									</span>
									<span className='prose prose-sm prose-invert line-clamp-1 max-w-none text-sm text-muted-foreground [&_*]:text-inherit' dangerouslySetInnerHTML={{ __html: post.blurb }} />
								</button>
							</li>
						))}
					</ul>
				)}
			</section>

			<EditNewsDialog post={isCreatingPost ? null : editingPost} isOpen={isPostDialogOpen} onClose={() => setIsPostDialogOpen(false)} onSave={handleSavePost} onDelete={handleDeletePost} />
		</div>
	);
}
