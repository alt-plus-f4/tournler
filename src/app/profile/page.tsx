'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Pencil, Check, X } from 'lucide-react';
import Image from 'next/image';
import { AvatarStep } from '@/components/onboarding/AvatarStep';
import { useToast } from '@/lib/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfilePage() {
    const [isEditing, setIsEditing] = useState(false);
    const [isAvatarEditing, setIsAvatarEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [profile, setProfile] = useState({
        displayName: '',
        bio: '',
        avatarUrl: '/avatar.png',
    });
    const { toast } = useToast();

    // Fetch user data from /api/user
    const fetchUser = useCallback(async () => {
        try {
            const response = await fetch('/api/user');
            if (!response.ok) throw new Error('Failed to fetch user data');
            const userData = await response.json();

            setProfile({
                displayName: userData.haha.name || '',
                bio: userData.haha.bio || '',
                avatarUrl: userData.haha.image || '/avatar.png',
            });
        } catch (error) {
            console.error('Error fetching user:', error);
            toast({
                variant: 'destructive',
                title: 'Error fetching user data',
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    // Fetch user on mount
    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    // Handle avatar updating
    const handleAvatarChange = useCallback(
        async (avatarBlob: Blob) => {
            try {
                const avatarText = await avatarBlob.text();
                const response = await fetch('/api/user/avatar', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ avatar: avatarText }),
                });
                const json = await response.json();

                if (response.ok && json.imageUrl) {
                    toast({ title: 'Avatar updated successfully' });
                    fetchUser(); // Refetch user data
                } else {
                    toast({
                        variant: 'destructive',
                        title: json.error || 'Failed to update avatar',
                    });
                }
            } catch (error) {
                console.error('Error updating avatar:', error);
                toast({
                    variant: 'destructive',
                    title: 'Error updating avatar',
                });
            } finally {
                setIsAvatarEditing(false);
            }
        },
        [fetchUser, toast]
    );

    // Handle profile save
    const handleSave = useCallback(async () => {
        try {
            setIsSaving(true);
            const response = await fetch('/api/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profile),
            });

            if (!response.ok) {
                throw new Error('Failed to update profile');
            }

            setIsEditing(false);
            toast({ title: 'Profile updated successfully' });
            fetchUser(); // Refetch user data
        } catch (error) {
            console.error('Error updating profile:', error);
            toast({
                variant: 'destructive',
                title: 'Failed to update profile',
            });
        } finally {
            setIsSaving(false);
        }
    }, [profile, toast, fetchUser]);

    const handleCancel = () => setIsEditing(false);

    // Render skeletons if loading
    if (isLoading) {
        return (
            <div className="min-h-screen py-12">
                <Card className="max-w-2xl mx-auto">
                    <CardContent className="p-6">
                        <div className="flex flex-col items-center text-center">
                            <Skeleton className="h-24 w-24 rounded-full" />
                            <div className="mt-6 space-y-4 w-full max-w-md">
                                <Skeleton className="h-8 w-[200px] mx-auto" />
                                <Skeleton className="h-4 w-[250px] mx-auto" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-12">
            <Card className="max-w-2xl mx-auto">
                <CardContent className="p-6">
                    <div className="flex justify-end mb-4">
                        {!isEditing ? (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsEditing(true)}
                                className="gap-2"
                            >
                                <Pencil className="h-4 w-4" />
                                Edit Profile
                            </Button>
                        ) : (
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleCancel}
                                    className="gap-2 text-destructive"
                                    disabled={isSaving}
                                >
                                    <X className="h-4 w-4" />
                                    Cancel
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleSave}
                                    className="gap-2 text-green-600"
                                    disabled={isSaving}
                                >
                                    <Check className="h-4 w-4" />
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col items-center text-center">
                        <div className="relative group">
                            <Image
                                src={profile.avatarUrl}
                                alt={`${profile.displayName}'s Profile`}
                                width={100}
                                height={100}
                                className="rounded-full w-24 h-24 border"
                            />
                            <Dialog
                                open={isAvatarEditing}
                                onOpenChange={setIsAvatarEditing}
                            >
                                <DialogTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="absolute bottom-0 right-0 bg-gray-700 text-white p-1 rounded-full opacity-75 hover:opacity-100"
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className='max-w-none w-fit'>
                                    <DialogTitle>Change Avatar</DialogTitle>
                                    <AvatarStep
                                        loading={false}
                                        previousStep={() => setIsAvatarEditing(false)}
                                        nextStep={handleAvatarChange}
                                    />
                                </DialogContent>
                            </Dialog>
                        </div>
                        <h2 className="text-xl font-bold mt-4">
                            {profile.displayName}
                        </h2>
                        <p className="text-gray-500">
                            {profile.bio || 'No bio available'}
                        </p>
                    </div>

                    {isEditing && (
                        <div className="mt-6 space-y-4">
                            <div>
                                <Label htmlFor="displayName">Display Name</Label>
                                <Input
                                    id="displayName"
                                    value={profile.displayName}
                                    onChange={(e) =>
                                        setProfile((prev) => ({
                                            ...prev,
                                            displayName: e.target.value,
                                        }))
                                    }
                                />
                            </div>
                            <div>
                                <Label htmlFor="bio">Bio</Label>
                                <Input
                                    id="bio"
                                    value={profile.bio}
                                    onChange={(e) =>
                                        setProfile((prev) => ({
                                            ...prev,
                                            bio: e.target.value,
                                        }))
                                    }
                                />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}