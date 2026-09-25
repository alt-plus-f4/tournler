'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { StepHeading, StepFooter } from './StepChrome';

const options = {
	mouth: ['default', 'smile', 'sad', 'serious', 'screamOpen', 'tongue', 'eating'],
	top: ['dreads01', 'curvy', 'frizzle', 'shaggy', 'bun', 'frida', 'turban', 'hijab', 'bigHair', 'bob', 'straight01', 'straight02', 'winterHat04', 'theCaesarAndSidePart'],
	accessories: ['none', 'eyepatch', 'kurt', 'prescription01', 'prescription02', 'round', 'sunglasses', 'wayfarers'],
	hairColor: ['f59797', 'ecdcbf', 'e8e1e1', 'd6b370', 'c93305', 'b58143', 'a55728', '724133', '4a312c', '2c1b18'],
	accessoryColor: ['black', 'blue', 'gray', 'green'],
	eyes: ['default', 'closed', 'cry', 'eyeRoll', 'happy', 'hearts', 'side', 'squint', 'surprised', 'wink', 'winkWacky', 'xDizzy'],
	eyebrows: ['angry', 'angryNatural', 'default', 'defaultNatural', 'flatNatural', 'frownNatural', 'raisedExcited', 'raisedExcitedNatural', 'sadConcerned', 'sadConcernedNatural', 'unibrowNatural', 'upDown', 'upDownNatural'],
	facialHair: ['none', 'beardLight', 'beardMajestic', 'beardMedium', 'moustacheFancy', 'moustacheMagnum'],
	skinColor: ['edb98a', '614335', 'ae5d29', 'd08b5b', 'f8d25c', 'ffdbb4', 'fd9841', 'ffffff'],
	facialHairColor: ['2c1b18', '4a312c', '724133', 'a55728', 'b58143', 'c93305', 'd6b370', 'e8e1e1', 'ecdcbf', 'f59797'],
	clothesColor: ['3c4f5c', '65c9ff', '262e33', '5199e4', '25557c', '929598', 'a7ffc4', 'b1e2ff', 'e6e6e6', 'ff5c5c', 'ff488e', 'ffafb9', 'ffffb1', 'ffffff'],
	clothing: ['blazerAndShirt', 'blazerAndSweater', 'collarAndSweater', 'graphicShirt', 'hoodie', 'overall', 'shirtCrewNeck', 'shirtScoopNeck', 'shirtVNeck'],
};

interface CustomizationOptions {
	mouth: number;
	top: number;
	accessories: number;
	hairColor: number;
	accessoryColor: number;
	eyes: number;
	eyebrows: number;
	facialHair: number;
	skinColor: number;
	facialHairColor: number;
	clothesColor: number;
	clothing: number;
}

type DiceBear = {
	createAvatar: typeof import('@dicebear/core').createAvatar;
	avataaars: typeof import('@dicebear/avataaars');
};

interface AvatarStepProps {
	previousStep: () => void;
	nextStep: (avatar: Blob) => void;
	loading: boolean;
}

interface CustomizationOptionProps {
	category: keyof CustomizationOptions;
	label: string;
	onPrevious: (category: keyof CustomizationOptions) => void;
	onNext: (category: keyof CustomizationOptions) => void;
}

function CustomizationOption({ category, label, onPrevious, onNext }: CustomizationOptionProps) {
	return (
		<div className='flex items-center justify-between gap-2 border-b border-border py-2 last:border-b-0'>
			<span className='text-xs font-bold uppercase tracking-wide text-neutral-400'>{label}</span>
			<div className='flex shrink-0 items-center gap-1'>
				<Button type='button' variant='outline' size='icon' className='h-7 w-7' onClick={() => onPrevious(category)} aria-label={`Previous ${label.toLowerCase()}`}>
					<ChevronLeft className='h-3.5 w-3.5' aria-hidden />
				</Button>
				<Button type='button' variant='outline' size='icon' className='h-7 w-7' onClick={() => onNext(category)} aria-label={`Next ${label.toLowerCase()}`}>
					<ChevronRight className='h-3.5 w-3.5' aria-hidden />
				</Button>
			</div>
		</div>
	);
}

export function AvatarStep({ previousStep, nextStep, loading }: AvatarStepProps) {
	const [customization, setCustomization] = useState<CustomizationOptions>({
		mouth: 0,
		top: 0,
		accessories: 0,
		hairColor: 0,
		accessoryColor: 0,
		eyes: 0,
		eyebrows: 0,
		facialHair: 0,
		skinColor: 0,
		facialHairColor: 0,
		clothesColor: 0,
		clothing: 0,
	});

	const handleNextOption = (category: keyof CustomizationOptions) => {
		const currentOptionIndex = customization[category];
		const nextOptionIndex = currentOptionIndex === options[category].length - 1 ? 0 : currentOptionIndex + 1;
		setCustomization({ ...customization, [category]: nextOptionIndex });
	};

	const handleGoToPreviousOption = (category: keyof CustomizationOptions) => {
		const currentOptionIndex = customization[category];
		const previousOptionIndex = currentOptionIndex === 0 ? options[category].length - 1 : currentOptionIndex - 1;
		setCustomization({ ...customization, [category]: previousOptionIndex });
	};

	// DiceBear (~100 KB) is only needed once this step is on screen, so it's fetched on mount rather
	// than bundled into every page that imports AvatarStep (onboarding dialog, profile avatar editor).
	const [dicebear, setDicebear] = useState<DiceBear | null>(null);
	useEffect(() => {
		let alive = true;
		Promise.all([import('@dicebear/core'), import('@dicebear/avataaars')]).then(([core, avataaars]) => {
			if (alive) setDicebear({ createAvatar: core.createAvatar, avataaars });
		});
		return () => {
			alive = false;
		};
	}, []);

	const avatarSVG = dicebear
		? dicebear
				.createAvatar(dicebear.avataaars, {
					seed: Math.random().toString(36).substring(7),
					...Object.fromEntries(Object.entries(customization).map(([key, value]) => [key, [options[key as keyof CustomizationOptions][value]]])),
					accessoriesProbability: 100,
					facialHairProbability: 100,
				})
				.toString()
		: '';

	const handleContinue = () => {
		if (!avatarSVG) return;
		const blob = new Blob([avatarSVG], { type: 'image/svg+xml' });
		nextStep(blob);
	};

	return (
		<div className='flex flex-1 flex-col px-6 py-10 sm:px-12'>
			<StepHeading title='Make your own avatar' description='Step through each feature with the arrows.' />

			<div className='flex flex-col items-center gap-6 sm:flex-row sm:items-start'>
				<div className='flex h-[120px] w-[120px] shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-black/40'>
					{avatarSVG ? (
						<Image src={`data:image/svg+xml;utf8,${encodeURIComponent(avatarSVG)}`} alt='Avatar preview' width={120} height={120} />
					) : (
						<div role='status' aria-label='Loading avatar preview' className='h-full w-full animate-pulse bg-neutral-900' />
					)}
				</div>

				<ScrollArea className='h-[220px] w-full'>
					<div className='grid grid-cols-1 gap-x-6 pr-3 sm:grid-cols-2'>
						<div className='flex flex-col'>
							<CustomizationOption category='skinColor' label='Skin color' onPrevious={handleGoToPreviousOption} onNext={handleNextOption} />
							<CustomizationOption category='eyes' label='Eyes' onPrevious={handleGoToPreviousOption} onNext={handleNextOption} />
							<CustomizationOption category='eyebrows' label='Eyebrows' onPrevious={handleGoToPreviousOption} onNext={handleNextOption} />
							<CustomizationOption category='mouth' label='Mouth' onPrevious={handleGoToPreviousOption} onNext={handleNextOption} />
							<CustomizationOption category='facialHair' label='Facial hair' onPrevious={handleGoToPreviousOption} onNext={handleNextOption} />
							<CustomizationOption category='facialHairColor' label='Facial hair color' onPrevious={handleGoToPreviousOption} onNext={handleNextOption} />
						</div>
						<div className='flex flex-col'>
							<CustomizationOption category='top' label='Top' onPrevious={handleGoToPreviousOption} onNext={handleNextOption} />
							<CustomizationOption category='hairColor' label='Hair color' onPrevious={handleGoToPreviousOption} onNext={handleNextOption} />
							<CustomizationOption category='clothing' label='Clothing' onPrevious={handleGoToPreviousOption} onNext={handleNextOption} />
							<CustomizationOption category='clothesColor' label='Clothes color' onPrevious={handleGoToPreviousOption} onNext={handleNextOption} />
							<CustomizationOption category='accessories' label='Accessories' onPrevious={handleGoToPreviousOption} onNext={handleNextOption} />
							<CustomizationOption category='accessoryColor' label='Accessory color' onPrevious={handleGoToPreviousOption} onNext={handleNextOption} />
						</div>
					</div>
				</ScrollArea>
			</div>

			<StepFooter onPrevious={previousStep} onNext={handleContinue} nextDisabled={!avatarSVG} loading={loading} />
		</div>
	);
}
