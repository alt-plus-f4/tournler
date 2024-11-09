'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useDispatch, useSelector } from 'react-redux';
import { updateFormData } from '@/lib/onboarding-slice';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { MultiSelect } from '../ui/multi-select';

const gameOptions = [
  { value: 'CS:2', label: 'CS: 2' },
  { value: 'League of Legends', label: 'League of Legends' },
  { value: 'Brawl Stars', label: 'Brawl Stars' },
];

const FormSchema = z.object({
  nickname: z.string().nonempty({ message: 'Nickname is required' }),
  games: z.array(z.string()).nonempty({ message: 'Please select at least one game' }),
});

interface NicknameStepProps {
  previousStep: () => void;
  nextStep: () => void;
}

export function NicknameStep({ previousStep, nextStep }: NicknameStepProps) {
  const dispatch = useDispatch();
  const formData = useSelector((store: { onboarding: { formData: { nickname: string; games: string[] } } }) => store.onboarding.formData);
  const form = useForm({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      nickname: formData.nickname || '',
      games: formData.games || [],
    },
  });

  const onSubmit = (data: { nickname: string; games: string[] }) => {
    dispatch(updateFormData(data));
    nextStep();
  };

  return (
    <Form {...form}>
      <form className="px-12 py-4" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="mb-8">
          <h5 className="text-xl md:text-3xl font-bold text-gray-900 dark:text-white">
            Nickname
          </h5>
          <p>Please provide your nickname and select the games you are playing.</p>
        </div>
        <FormField
          control={form.control}
          name="nickname"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="nickname">Nickname</FormLabel>
              <FormControl>
                <Input
                  id="nickname"
                  placeholder="Enter your nickname"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="games"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="games">Games</FormLabel>
              <FormControl>
                <MultiSelect
                    options={gameOptions}
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    placeholder="Select games you are playing"
                  />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter className="flex mt-8 gap-y-1 sm:gap-y-0 justify-between">
          <Button type="button" onClick={previousStep} variant="outline">
            Previous
          </Button>
          <Button type="submit">Continue</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}