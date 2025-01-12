'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/lib/hooks/use-toast';

interface Tournament {
  id: number;
  name: string;
  prizePool: number;
  teamCapacity: number;
  location: string;
  startDate: string;
  endDate: string;
  bannerUrl: string;
  logoUrl: string;
  status: number;
  type: number;
}

interface EditTournamentDialogProps {
  tournament: Tournament | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedTournament: Tournament) => void;
}

export default function EditTournamentDialog({ tournament, isOpen, onClose, onSave }: EditTournamentDialogProps) {
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(tournament);
  const { toast } = useToast();

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTournament) return;

    const formData = new FormData();
    formData.append('name', editingTournament.name);
    formData.append('prizePool', editingTournament.prizePool.toString());
    formData.append('teamCapacity', editingTournament.teamCapacity.toString());
    formData.append('location', editingTournament.location);
    formData.append('startDate', editingTournament.startDate);
    formData.append('endDate', editingTournament.endDate);
    formData.append('status', editingTournament.status.toString());
    formData.append('type', editingTournament.type.toString());

    const response = await fetch(`/api/tournaments/${editingTournament.id}`, {
      method: 'PUT',
      body: formData,
    });

    if (response.ok) {
      toast({
        title: 'Success',
        description: 'Tournament updated successfully',
        variant: 'default',
      });
      onSave(editingTournament);
      onClose();
    } else {
      toast({
        title: 'Error',
        description: 'Failed to update tournament',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='h-[800px] overflow-scroll'>
        <DialogHeader>
          <DialogTitle>Edit Tournament</DialogTitle>
          <DialogDescription>
            Update the tournament details.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleEdit} className='space-y-2'>
          <Label htmlFor='edit-name'>Tournament Name</Label>
          <Input
            id='edit-name'
            value={editingTournament?.name || ''}
            onChange={(e) => setEditingTournament(prev =>
              prev ? { ...prev, name: e.target.value } : null
            )}
            required
          />
          <Label htmlFor='edit-prizePool'>Prize Pool</Label>
          <Input
            id='edit-prizePool'
            type='number'
            value={editingTournament?.prizePool || ''}
            onChange={(e) => setEditingTournament(prev =>
              prev ? { ...prev, prizePool: Number(e.target.value) } : null
            )}
            required
          />
          <Label htmlFor='edit-teamCapacity'>Team Capacity</Label>
          <Input
            id='edit-teamCapacity'
            type='number'
            value={editingTournament?.teamCapacity || ''}
            onChange={(e) => setEditingTournament(prev =>
              prev ? { ...prev, teamCapacity: Number(e.target.value) } : null
            )}
            required
          />
          <Label htmlFor='edit-location'>Location</Label>
          <Input
            id='edit-location'
            value={editingTournament?.location || ''}
            onChange={(e) => setEditingTournament(prev =>
              prev ? { ...prev, location: e.target.value } : null
            )}
            required
          />
          <Label htmlFor='edit-startDate'>Start Date</Label>
          <Input
            id='edit-startDate'
            type='date'
            value={editingTournament?.startDate || ''}
            onChange={(e) => setEditingTournament(prev =>
              prev ? { ...prev, startDate: e.target.value } : null
            )}
            required
          />
          <Label htmlFor='edit-endDate'>End Date</Label>
          <Input
            id='edit-endDate'
            type='date'
            value={editingTournament?.endDate || ''}
            onChange={(e) => setEditingTournament(prev =>
              prev ? { ...prev, endDate: e.target.value } : null
            )}
            required
          />
          <Label htmlFor='edit-status'>Status</Label>
          <Input
            id='edit-status'
            type='number'
            value={editingTournament?.status || ''}
            onChange={(e) => setEditingTournament(prev =>
              prev ? { ...prev, status: Number(e.target.value) } : null
            )}
            required
          />
          <Label htmlFor='edit-type'>Type</Label>
          <Input
            id='edit-type'
            type='number'
            value={editingTournament?.type || ''}
            onChange={(e) => setEditingTournament(prev =>
              prev ? { ...prev, type: Number(e.target.value) } : null
            )}
            required
          />
          <Button type='submit' className='w-full mt-3'>
            Update Tournament
          </Button>
        </form>
        <DialogClose asChild>
          <Button variant='outline'>Close</Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}