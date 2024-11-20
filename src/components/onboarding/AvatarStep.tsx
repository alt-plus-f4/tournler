'use client';

import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import React, { useState } from 'react';
import { avataaars } from '@dicebear/collection';
import { createAvatar } from '@dicebear/core';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';

const options = {
  mouth: [
    'default',
    'smile',
    'sad',
    'serious',
    'screamOpen',
    'tongue',
    'eating',
  ],
  top: [
    'dreads01',
    'curvy',
    'frizzle',
    'shaggy',
    'bun',
    'frida',
    'turban',
    'hijab',
    'bigHair',
    'bob',
    'straight01',
    'straight02',
    'winterHat04',
    'theCaesarAndSidePart',
  ],
  accessories: [
    'none',
    'eyepatch',
    'kurt',
    'prescription01',
    'prescription02',
    'round',
    'sunglasses',
    'wayfarers',
  ],
  hairColor: [
    'f59797',
    'ecdcbf',
    'e8e1e1',
    'd6b370',
    'c93305',
    'b58143',
    'a55728',
    '724133',
    '4a312c',
    '2c1b18',
  ],
  accessoryColor: ['black', 'blue', 'gray', 'green'],
  eyes: [
    'default',
    'closed',
    'cry',
    'eyeRoll',
    'happy',
    'hearts',
    'side',
    'squint',
    'surprised',
    'wink',
    'winkWacky',
    'xDizzy',
  ],
  eyebrows: [
    'angry',
    'angryNatural',
    'default',
    'defaultNatural',
    'flatNatural',
    'frownNatural',
    'raisedExcited',
    'raisedExcitedNatural',
    'sadConcerned',
    'sadConcernedNatural',
    'unibrowNatural',
    'upDown',
    'upDownNatural',
  ],
  facialHair: [
    'none',
    'beardLight',
    'beardMajestic',
    'beardMedium',
    'moustacheFancy',
    'moustacheMagnum',
  ],
  skinColor: [
    'edb98a',
    '614335',
    'ae5d29',
    'd08b5b',
    'f8d25c',
    'ffdbb4',
    'fd9841',
  ],
  facialHairColor: [
    '2c1b18',
    '4a312c',
    '724133',
    'a55728',
    'b58143',
    'c93305',
    'd6b370',
    'e8e1e1',
    'ecdcbf',
    'f59797',
  ],
  clothesColor: [
    '3c4f5c',
    '65c9ff',
    '262e33',
    '5199e4',
    '25557c',
    '929598',
    'a7ffc4',
    'b1e2ff',
    'e6e6e6',
    'ff5c5c',
    'ff488e',
    'ffafb9',
    'ffffb1',
    'ffffff',
  ],
  clothing: [
    'blazerAndShirt',
    'blazerAndSweater',
    'collarAndSweater',
    'graphicShirt',
    'hoodie',
    'overall',
    'shirtCrewNeck',
    'shirtScoopNeck',
    'shirtVNeck',
  ],
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


interface AvatarStepProps {
    previousStep: () => void;
    nextStep: (avatar: File) => void;
}

interface CustomizationOptionProps {
  category: keyof CustomizationOptions;
  label: string;
  onPrevious: (category: keyof CustomizationOptions) => void;
  onNext: (category: keyof CustomizationOptions) => void;
}

function CustomizationOption({
  category,
  label,
  onPrevious,
  onNext,
}: CustomizationOptionProps) {
  return (
    <div className="flex items-center justify-between my-1">
      <Button variant="secondary" onClick={() => onPrevious(category)}>
        <FaArrowLeft />
      </Button>

      <span className="mx-4 my-0">{label}</span>
      <Button variant="secondary" onClick={() => onNext(category)}>
        <FaArrowRight />
      </Button>
    </div>
  );
}

function dataURLtoFile(dataURL: string) {
  const arr = dataURL.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : '';
  let bstr = '';

  if (arr[0].indexOf('base64') !== -1) {
    bstr = atob(arr[1]);
  } else {
    bstr = decodeURIComponent(arr[1]);
  }

  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  for (; n >= 0; n -= 1) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  const file = new File([u8arr], 'avatar.svg', { type: mime });
  console.log(file);
  return file;
}

export function AvatarStep({ previousStep, nextStep }: AvatarStepProps) {
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
    const nextOptionIndex =
      currentOptionIndex === options[category].length - 1
        ? 0
        : currentOptionIndex + 1;
    setCustomization({ ...customization, [category]: nextOptionIndex });
  };

  const handleGoToPreviousOption = (category: keyof CustomizationOptions) => {
    const currentOptionIndex = customization[category];
    const previousOptionIndex =
      currentOptionIndex === 0
        ? options[category].length - 1
        : currentOptionIndex - 1;
    setCustomization({ ...customization, [category]: previousOptionIndex });
  };

  const avatar = createAvatar(avataaars, {
    seed: Math.random().toString(36).substring(7),
    ...Object.fromEntries(
      Object.entries(customization).map(([key, value]) => [
        key,
        [options[key as keyof CustomizationOptions][value]],
      ])
    ),
    accessoriesProbability: 100,
    facialHairProbability: 100,
  });

  return (
    <div className="px-12 flex flex-col justify-center">
      <div className="flex justify-center items-center">
        <Image src={avatar.toDataUri()} alt="" width={120} height={120} />
      </div>
      <div>
        <div className="flex flex-col items-center text-center w-full">
          <h1 className="text-lg font-semibold">Make your own avatar</h1>
          <p>Customize it here</p>
        </div>
        <ScrollArea className="px-2 mt-2 text-center">
          <div className="flex flex-col sm:flex-row">
            <div className="flex flex-col w-[220px] xl:w-[250px] mr-1">
              <CustomizationOption
                category="skinColor"
                label="Skin color"
                onPrevious={handleGoToPreviousOption}
                onNext={handleNextOption}
              />
              <CustomizationOption
                category="eyes"
                label="Eyes"
                onPrevious={handleGoToPreviousOption}
                onNext={handleNextOption}
              />
              <CustomizationOption
                category="eyebrows"
                label="Eyebrows"
                onPrevious={handleGoToPreviousOption}
                onNext={handleNextOption}
              />
              <CustomizationOption
                category="mouth"
                label="Mouth"
                onPrevious={handleGoToPreviousOption}
                onNext={handleNextOption}
              />
              <CustomizationOption
                category="facialHair"
                label="Facial hair"
                onPrevious={handleGoToPreviousOption}
                onNext={handleNextOption}
              />
              <CustomizationOption
                category="facialHairColor"
                label="Facial hair color"
                onPrevious={handleGoToPreviousOption}
                onNext={handleNextOption}
              />
            </div>

            <div className="flex flex-col w-[220px] xl:w-[250px] ml-1">
              <CustomizationOption
                category="top"
                label="Top"
                onPrevious={handleGoToPreviousOption}
                onNext={handleNextOption}
              />
              <CustomizationOption
                category="hairColor"
                label="Hair color"
                onPrevious={handleGoToPreviousOption}
                onNext={handleNextOption}
              />
              <CustomizationOption
                category="clothing"
                label="Clothing"
                onPrevious={handleGoToPreviousOption}
                onNext={handleNextOption}
              />
              <CustomizationOption
                category="clothesColor"
                label="Clothes color"
                onPrevious={handleGoToPreviousOption}
                onNext={handleNextOption}
              />
              <CustomizationOption
                category="accessories"
                label="Accessories"
                onPrevious={handleGoToPreviousOption}
                onNext={handleNextOption}
              />
              <CustomizationOption
                category="accessoryColor"
                label="Accessory color"
                onPrevious={handleGoToPreviousOption}
                onNext={handleNextOption}
              />
            </div>
          </div>
        </ScrollArea>
      </div>

      <DialogFooter className="flex mt-2 justify-between">
        <Button onClick={previousStep} variant="secondary">
          Previous
        </Button>
        <Button
          onClick={() => {
            const avatarFile = dataURLtoFile(avatar.toDataUri());
            nextStep(avatarFile);
          }}
        >
          Continue
        </Button>
      </DialogFooter>
    </div>
  );
}