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

interface TeamFormProps {
  onSubmit: (formData: FormData) => Promise<void>;
}

export function TeamForm({ onSubmit }: TeamFormProps) {
  const [name, setName] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [capitanId, setCapitanId] = useState('');
  const [members, setMembers] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', name);
    if (logoFile) formData.append('logoFile', logoFile);
    formData.append('capitanId', capitanId);
    formData.append('members', members); // Members can be a comma-separated list of user IDs

    await onSubmit(formData);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Create New Team</Button>
      </DialogTrigger>
      <DialogContent className="h-[500px] overflow-scroll">
        <DialogHeader>
          <DialogTitle>Create Team</DialogTitle>
          <DialogDescription>
            Fill in the details to create a new team.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-2">
          <Label htmlFor="name">Team Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Label htmlFor="logoFile">Team Logo</Label>
          <Input
            id="logoFile"
            type="file"
            onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
          />
          <Label htmlFor="capitanId">Captain ID</Label>
          <Input
            id="capitanId"
            value={capitanId}
            onChange={(e) => setCapitanId(e.target.value)}
            required
          />
          <Label htmlFor="members">Team Members (comma-separated IDs)</Label>
          <Input
            id="members"
            value={members}
            onChange={(e) => setMembers(e.target.value)}
            required
          />
          <Button type="submit" className="w-full mt-3">
            Create Team
          </Button>
        </form>
        <DialogClose asChild>
          <Button variant="outline">Close</Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
