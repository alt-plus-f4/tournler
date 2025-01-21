'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
	Dialog,
	DialogTrigger,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogClose,
} from '@/components/ui/dialog';

interface TournamentFormProps {
	onSubmit: (formData: FormData) => Promise<void>;
}

export function TournamentForm({ onSubmit }: TournamentFormProps) {
	const [name, setName] = useState('');
	const [prizePool, setPrizePool] = useState<number | ''>('');
	const [teamCapacity, setTeamCapacity] = useState<number | ''>('');
	const [location, setLocation] = useState('');
	const [startDate, setStartDate] = useState('');
	const [endDate, setEndDate] = useState('');
	const [bannerFile, setBannerFile] = useState<File | null>(null);
	const [logoFile, setLogoFile] = useState<File | null>(null);
	const [status, setStatus] = useState<number | ''>('');
	const [type, setType] = useState<number | ''>('');
	const [organizer, setOrganizer] = useState('');

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const formData = new FormData();
		formData.append('name', name);
		formData.append('prizePool', prizePool.toString());
		formData.append('teamCapacity', teamCapacity.toString());
		formData.append('location', location);
		formData.append('startDate', startDate);
		formData.append('endDate', endDate);
		if (bannerFile) formData.append('bannerFile', bannerFile);
		if (logoFile) formData.append('logoFile', logoFile);
		formData.append('status', status.toString());
		formData.append('type', type.toString());
		formData.append('organizerId', organizer.toString());

		await onSubmit(formData);
	};

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button>Create New Tournament</Button>
			</DialogTrigger>
			<DialogContent className='h-[800px] overflow-scroll'>
				<DialogHeader>
					<DialogTitle>Create Tournament</DialogTitle>
					<DialogDescription>
						Fill in the details to create a new tournament.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className='space-y-2'>
					<Label htmlFor='name'>Tournament Name</Label>
					<Input
						id='name'
						value={name}
						onChange={(e) => setName(e.target.value)}
						required
					/>
					<Label htmlFor='prizePool'>Prize Pool</Label>
					<Input
						id='prizePool'
						type='number'
						value={prizePool}
						onChange={(e) => setPrizePool(Number(e.target.value))}
						required
					/>
					<Label htmlFor='teamCapacity'>Team Capacity</Label>
					<Input
						id='teamCapacity'
						type='number'
						value={teamCapacity}
						onChange={(e) =>
							setTeamCapacity(Number(e.target.value))
						}
						required
					/>
					<Label htmlFor='location'>Location</Label>
					<Input
						id='location'
						value={location}
						onChange={(e) => setLocation(e.target.value)}
						required
					/>
					<Label htmlFor='startDate'>Start Date</Label>
					<Input
						id='startDate'
						type='date'
						value={startDate}
						onChange={(e) => setStartDate(e.target.value)}
						required
					/>
					<Label htmlFor='endDate'>End Date</Label>
					<Input
						id='endDate'
						type='date'
						value={endDate}
						onChange={(e) => setEndDate(e.target.value)}
						required
					/>
					<Label htmlFor='bannerFile'>Banner</Label>
					<Input
						id='bannerFile'
						type='file'
						onChange={(e) =>
							setBannerFile(e.target.files?.[0] || null)
						}
					/>
					<Label htmlFor='logoFile'>Logo</Label>
					<Input
						id='logoFile'
						type='file'
						onChange={(e) =>
							setLogoFile(e.target.files?.[0] || null)
						}
					/>
					<Label htmlFor='status'>Status</Label>
					<Input
						id='status'
						type='number'
						value={status}
						onChange={(e) => setStatus(Number(e.target.value))}
						required
					/>
					<Label htmlFor='type'>Type</Label>
					<Input
						id='type'
						type=''
						value={type}
						onChange={(e) => setType(Number(e.target.value))}
						required
					/>
					<Label htmlFor='name'>Organizer</Label>
					<Input
						id='organizer'
						value={organizer}
						onChange={(e) => setOrganizer(e.target.value)}
						required
					/>
					<Button type='submit' className='w-full mt-3'>
						Create Tournament
					</Button>
				</form>
				<DialogClose asChild>
					<Button variant='outline'>Close</Button>
				</DialogClose>
			</DialogContent>
		</Dialog>
	);
}
