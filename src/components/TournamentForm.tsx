'use client';

import { useEffect, useState } from 'react';
import { Controller, useForm, type FieldPath } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RichTextEditor } from '@/components/LazyRichTextEditor';
import { formatMoney } from '@/lib/helpers/format-money';
import { cn } from '@/lib/utils';

const FORMAT_OPTIONS = [
	{ value: '0', label: 'Single elimination' },
	{ value: '1', label: 'Round robin' },
	{ value: '2', label: 'Double elimination' },
] as const;

const TYPE_OPTIONS = [
	{ value: '0', label: 'Online' },
	{ value: '1', label: 'LAN' },
] as const;

const optionalNumber = z.preprocess((v) => (v === '' || v === null || v === undefined || Number.isNaN(v) ? undefined : Number(v)), z.number().int().min(0, 'Must be 0 or more').optional());

const schema = z
	.object({
		name: z.string().trim().min(1, 'Give the tournament a name'),
		format: z.enum(['0', '1', '2']),
		type: z.enum(['0', '1']),
		location: z.string().trim().min(1, 'Add a location (a city, venue or region)'),
		teamCapacity: z.preprocess((v) => (v === '' || Number.isNaN(v) ? undefined : Number(v)), z.number({ required_error: 'Set how many teams can join', invalid_type_error: 'Set how many teams can join' }).int().min(2, 'At least 2 teams').max(256, 'At most 256 teams')),
		startDate: z.string().min(1, 'Pick a start time'),
		endDate: z.string().min(1, 'Pick an end time'),
		description: z.string().optional(),
		prizePool: optionalNumber,
		bannerFile: z.custom<File | null>().optional(),
		logoFile: z.custom<File | null>().optional(),
	})
	.refine((v) => !v.startDate || !v.endDate || new Date(v.endDate) >= new Date(v.startDate), { path: ['endDate'], message: 'End must be after the start' });

type FormValues = z.input<typeof schema>;
type ParsedValues = z.output<typeof schema>;

const STEPS: { title: string; fields: FieldPath<FormValues>[] }[] = [
	{ title: 'Basics', fields: ['name', 'format', 'type', 'location', 'teamCapacity'] },
	{ title: 'Schedule', fields: ['startDate', 'endDate', 'description', 'prizePool'] },
	{ title: 'Media & review', fields: ['bannerFile', 'logoFile'] },
];

const DEFAULTS: FormValues = {
	name: '',
	format: '0',
	type: '0',
	location: '',
	teamCapacity: '' as unknown as number,
	startDate: '',
	endDate: '',
	description: '',
	prizePool: '' as unknown as number,
	bannerFile: null,
	logoFile: null,
};

interface TournamentFormProps {
	/** Return false to keep the dialog open (e.g. the request failed). */
	onSubmit: (formData: FormData) => Promise<boolean | void>;
	/** Open the dialog on mount (used by /admin/tournaments?create=1). */
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
}

function FieldError({ id, message }: { id: string; message?: string }) {
	if (!message) return null;
	return (
		<p id={id} role='alert' className='text-xs text-signal-live'>
			{message}
		</p>
	);
}

function formatDateTime(value: string) {
	if (!value) return '—';
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function TournamentForm({ onSubmit, defaultOpen = false, onOpenChange }: TournamentFormProps) {
	const [open, setOpen] = useState(defaultOpen);
	const [step, setStep] = useState(0);

	const {
		register,
		control,
		handleSubmit,
		trigger,
		reset,
		watch,
		formState: { errors, isSubmitting },
	} = useForm<FormValues, unknown, ParsedValues>({ resolver: zodResolver(schema), defaultValues: DEFAULTS, mode: 'onTouched' });

	useEffect(() => {
		if (defaultOpen) setOpen(true);
	}, [defaultOpen]);

	const changeOpen = (next: boolean) => {
		setOpen(next);
		if (!next) {
			setStep(0);
			reset(DEFAULTS);
		}
		onOpenChange?.(next);
	};

	const next = async () => {
		const ok = await trigger(STEPS[step].fields);
		if (ok) setStep((s) => Math.min(s + 1, STEPS.length - 1));
	};

	const submit = handleSubmit(async (values) => {
		const formData = new FormData();
		formData.append('name', values.name);
		formData.append('format', values.format);
		formData.append('type', values.type);
		formData.append('location', values.location);
		formData.append('teamCapacity', String(values.teamCapacity));
		formData.append('startDate', new Date(values.startDate).toISOString());
		formData.append('endDate', new Date(values.endDate).toISOString());
		if (values.description) formData.append('description', values.description);
		if (values.prizePool !== undefined) formData.append('prizePool', String(values.prizePool));
		if (values.bannerFile) formData.append('bannerFile', values.bannerFile);
		if (values.logoFile) formData.append('logoFile', values.logoFile);
		// New tournaments always start as UPCOMING; the organizer is taken from the session server-side.
		formData.append('status', '0');

		const result = await onSubmit(formData);
		if (result !== false) changeOpen(false);
	});

	const v = watch();
	const isLast = step === STEPS.length - 1;
	const errId = (name: string) => `create-${name}-error`;
	const invalid = (name: keyof FormValues) => (errors[name] ? { 'aria-invalid': true, 'aria-describedby': errId(name) } : {});

	return (
		<Dialog open={open} onOpenChange={changeOpen}>
			<DialogTrigger asChild>
				<Button>Create tournament</Button>
			</DialogTrigger>
			<DialogContent className='sm:max-w-[560px] max-h-[90vh] overflow-y-auto'>
				<DialogHeader>
					<DialogTitle>Create tournament</DialogTitle>
					<DialogDescription>
						Step {step + 1} of {STEPS.length}: {STEPS[step].title}
					</DialogDescription>
				</DialogHeader>

				<ol className='grid grid-cols-3 gap-2' aria-label='Progress'>
					{STEPS.map((s, i) => (
						<li
							key={s.title}
							aria-current={i === step ? 'step' : undefined}
							className={cn('border-t-2 pt-2 text-xs font-medium', i === step ? 'border-foreground text-foreground' : i < step ? 'border-neutral-400 text-neutral-300' : 'border-border text-muted-foreground')}
						>
							<span className='font-mono tabular-nums'>{i + 1}</span> {s.title}
						</li>
					))}
				</ol>

				<form
					onSubmit={(e) => {
						e.preventDefault();
						if (isLast) void submit(e);
						else void next();
					}}
					className='space-y-4'
					noValidate
				>
					{step === 0 && (
						<>
							<div className='space-y-2'>
								<Label htmlFor='create-name'>Tournament name</Label>
								<Input id='create-name' autoFocus {...register('name')} {...invalid('name')} />
								<FieldError id={errId('name')} message={errors.name?.message} />
							</div>
							<div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
								<div className='space-y-2'>
									<Label htmlFor='create-format'>Bracket format</Label>
									<Controller
										control={control}
										name='format'
										render={({ field }) => (
											<Select value={field.value} onValueChange={field.onChange}>
												<SelectTrigger id='create-format'>
													<SelectValue placeholder='Select a format' />
												</SelectTrigger>
												<SelectContent>
													{FORMAT_OPTIONS.map((o) => (
														<SelectItem key={o.value} value={o.value}>
															{o.label}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										)}
									/>
								</div>
								<div className='space-y-2'>
									<Label htmlFor='create-type'>Online or LAN</Label>
									<Controller
										control={control}
										name='type'
										render={({ field }) => (
											<Select value={field.value} onValueChange={field.onChange}>
												<SelectTrigger id='create-type'>
													<SelectValue placeholder='Select a type' />
												</SelectTrigger>
												<SelectContent>
													{TYPE_OPTIONS.map((o) => (
														<SelectItem key={o.value} value={o.value}>
															{o.label}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										)}
									/>
								</div>
							</div>
							<div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
								<div className='space-y-2'>
									<Label htmlFor='create-location'>Location</Label>
									<Input id='create-location' placeholder='e.g. Europe, or Sofia Arena' {...register('location')} {...invalid('location')} />
									<FieldError id={errId('location')} message={errors.location?.message} />
								</div>
								<div className='space-y-2'>
									<Label htmlFor='create-teamCapacity'>Team capacity</Label>
									<Input id='create-teamCapacity' type='number' inputMode='numeric' min={2} max={256} className='font-mono tabular-nums' {...register('teamCapacity')} {...invalid('teamCapacity')} />
									<FieldError id={errId('teamCapacity')} message={errors.teamCapacity?.message} />
								</div>
							</div>
						</>
					)}

					{step === 1 && (
						<>
							<div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
								<div className='space-y-2'>
									<Label htmlFor='create-startDate'>Starts</Label>
									<Input id='create-startDate' type='datetime-local' autoFocus className='font-mono tabular-nums' {...register('startDate')} {...invalid('startDate')} />
									<FieldError id={errId('startDate')} message={errors.startDate?.message} />
								</div>
								<div className='space-y-2'>
									<Label htmlFor='create-endDate'>Ends</Label>
									<Input id='create-endDate' type='datetime-local' className='font-mono tabular-nums' {...register('endDate')} {...invalid('endDate')} />
									<FieldError id={errId('endDate')} message={errors.endDate?.message} />
								</div>
							</div>
							<div className='space-y-2'>
								<Label id='create-description-label'>Description</Label>
								<Controller control={control} name='description' render={({ field }) => <RichTextEditor labelId='create-description-label' value={field.value ?? ''} onChange={field.onChange} placeholder='Tell players what this tournament is about' />} />
							</div>
							<div className='space-y-2'>
								<Label htmlFor='create-prizePool'>Prize pool (USD, optional)</Label>
								<Input id='create-prizePool' type='number' inputMode='numeric' min={0} className='font-mono tabular-nums' {...register('prizePool')} {...invalid('prizePool')} />
								<FieldError id={errId('prizePool')} message={errors.prizePool?.message} />
							</div>
						</>
					)}

					{step === 2 && (
						<>
							<div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
								<div className='space-y-2'>
									<Label htmlFor='create-bannerFile'>Banner (optional)</Label>
									<Controller
										control={control}
										name='bannerFile'
										render={({ field }) => <Input id='create-bannerFile' type='file' accept='image/*' onChange={(e) => field.onChange(e.target.files?.[0] ?? null)} />}
									/>
								</div>
								<div className='space-y-2'>
									<Label htmlFor='create-logoFile'>Logo (optional)</Label>
									<Controller
										control={control}
										name='logoFile'
										render={({ field }) => <Input id='create-logoFile' type='file' accept='image/*' onChange={(e) => field.onChange(e.target.files?.[0] ?? null)} />}
									/>
								</div>
							</div>

							<section aria-labelledby='create-review-heading' className='rounded-md border border-border'>
								<h3 id='create-review-heading' className='border-b border-border px-3 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground'>
									Review
								</h3>
								<dl className='grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 px-3 py-2 text-sm'>
									<dt className='text-muted-foreground'>Name</dt>
									<dd className='truncate'>{v.name || '—'}</dd>
									<dt className='text-muted-foreground'>Format</dt>
									<dd>{FORMAT_OPTIONS.find((o) => o.value === v.format)?.label}</dd>
									<dt className='text-muted-foreground'>Type</dt>
									<dd>
										{TYPE_OPTIONS.find((o) => o.value === v.type)?.label} · {v.location || '—'}
									</dd>
									<dt className='text-muted-foreground'>Teams</dt>
									<dd className='font-mono tabular-nums'>{String(v.teamCapacity ?? '') || '—'}</dd>
									<dt className='text-muted-foreground'>Starts</dt>
									<dd className='font-mono tabular-nums'>{formatDateTime(v.startDate)}</dd>
									<dt className='text-muted-foreground'>Ends</dt>
									<dd className='font-mono tabular-nums'>{formatDateTime(v.endDate)}</dd>
									<dt className='text-muted-foreground'>Prize pool</dt>
									<dd className='font-mono tabular-nums'>{v.prizePool === undefined || String(v.prizePool) === '' ? 'None' : formatMoney(Number(v.prizePool))}</dd>
									<dt className='text-muted-foreground'>Status</dt>
									<dd>Upcoming</dd>
								</dl>
							</section>

							<section aria-labelledby='create-auto-heading' className='rounded-md border border-border px-3 py-2'>
								<h3 id='create-auto-heading' className='text-xs font-bold uppercase tracking-widest text-muted-foreground'>
									What Tournler does for you
								</h3>
								<ul className='mt-2 list-disc space-y-1 pl-4 text-sm text-neutral-300'>
									<li>Provisions a CS2 server for each match about 5 minutes before it starts.</li>
									<li>Takes scores straight from the game server, so nobody types them in.</li>
									<li>Advances the bracket automatically as matches finish.</li>
								</ul>
							</section>
						</>
					)}

					<div className='flex items-center gap-2 border-t border-border pt-4'>
						<Button type='button' variant='ghost' onClick={() => changeOpen(false)}>
							Cancel
						</Button>
						<div className='ml-auto flex gap-2'>
							{step > 0 && (
								<Button type='button' variant='outline' onClick={() => setStep((s) => s - 1)}>
									Back
								</Button>
							)}
							{isLast ? (
								<Button type='submit' isLoading={isSubmitting}>
									Create tournament
								</Button>
							) : (
								<Button type='submit'>Next</Button>
							)}
						</div>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
