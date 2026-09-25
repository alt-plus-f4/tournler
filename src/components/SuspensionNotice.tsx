import { LocalTime } from '@/components/LocalTime';

// Re-exported so existing `@/components/SuspensionNotice` imports keep working; it's the only
// interactive part, so it lives in its own client module and this notice can render on the server.
export { SuspendedSignOut } from '@/components/SuspendedSignOut';

type Ban = { reason: string; expiresAt: string | null };

/**
 * Site-wide notice for a suspended account. Shown under the navbar on every page while the ban
 * is active; the account can browse but every signed-in action is refused (src/lib/bans.ts).
 */
export function SuspensionNotice({ ban }: { ban: Ban }) {
	return (
		<div role='status' className='border-b border-border border-t-2 border-t-signal-live bg-black'>
			<div className='container mx-auto flex max-w-[1400px] flex-col gap-2 px-4 py-3 text-sm lg:flex-row lg:items-center lg:gap-6 lg:px-8'>
				<p className='font-bold text-white'>
					Your account is suspended{' '}
					{ban.expiresAt ? (
						<>
							until <LocalTime iso={ban.expiresAt} className='font-mono tabular-nums' />
						</>
					) : (
						'permanently'
					)}
					.
				</p>
				<p className='min-w-0 flex-1 text-muted-foreground'>
					<span className='text-neutral-300'>Reason:</span> <span className='break-words'>{ban.reason}</span>
					<span className='block lg:inline'> You can still browse, but posting, teams, tournaments and matches are disabled.</span>
				</p>
			</div>
		</div>
	);
}
