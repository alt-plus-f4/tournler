'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { useDispatch, useSelector } from 'react-redux';
import { updateFormData } from '@/lib/onboarding-slice';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { StepHeading, StepFooter } from './StepChrome';

const FormSchema = z.object({
	nickname: z.string().min(1, { message: 'Nickname is required' }),
});

interface NicknameStepProps {
	previousStep: () => void;
	nextStep: (nickname: string) => void;
	loading: boolean;
}

export function NicknameStep({ previousStep, nextStep, loading }: NicknameStepProps) {
	const dispatch = useDispatch();
	const formData = useSelector((store: { onboarding: { formData: { nickname: string; games: string[] } } }) => store.onboarding.formData);
	const form = useForm({
		resolver: zodResolver(FormSchema),
		defaultValues: { nickname: formData.nickname || '' },
	});

	const onSubmit = (data: { nickname: string }) => {
		dispatch(updateFormData({ ...formData, ...data }));
		nextStep(data.nickname);
	};

	return (
		<Form {...form}>
			<form className='flex flex-1 flex-col px-6 py-10 sm:px-12' onSubmit={form.handleSubmit(onSubmit)}>
				<StepHeading center={false} title='Nickname' description='This is the name other players see in brackets and on the scoreboard.' />
				<FormField
					control={form.control}
					name='nickname'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Nickname</FormLabel>
							<FormControl>
								<Input autoComplete='nickname' placeholder='Enter your nickname' {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<StepFooter onPrevious={previousStep} nextType='submit' loading={loading} />
			</form>
		</Form>
	);
}
