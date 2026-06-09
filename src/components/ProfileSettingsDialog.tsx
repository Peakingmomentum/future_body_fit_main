import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { Settings, Save, Loader2 } from 'lucide-react';

export function ProfileSettingsDialog() {
  const { profile, updateProfile, isUpdating } = useProfile();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    current_weight: '',
    goal_weight: '',
    height: '',
    age: '',
    gender: '',
    fitness_level: 'beginner',
    goal_type: 'general',
  });

  useEffect(() => {
    if (profile) {
      setForm({
        current_weight: profile.current_weight?.toString() || '',
        goal_weight: profile.goal_weight?.toString() || '',
        height: profile.height?.toString() || '',
        age: profile.age?.toString() || '',
        gender: profile.gender || '',
        fitness_level: profile.fitness_level || 'beginner',
        goal_type: profile.goal_type || 'general',
      });
    }
  }, [profile, open]);

  const handleSave = () => {
    updateProfile({
      current_weight: form.current_weight ? Number(form.current_weight) : null,
      goal_weight: form.goal_weight ? Number(form.goal_weight) : null,
      height: form.height ? Number(form.height) : null,
      age: form.age ? Number(form.age) : null,
      gender: form.gender || null,
      fitness_level: form.fitness_level,
      goal_type: form.goal_type,
    }, {
      onSuccess: () => {
        toast({ title: 'Profile updated!', description: 'Your goals have been saved.' });
        setOpen(false);
      },
      onError: () => {
        toast({ title: 'Error', description: 'Failed to save changes.', variant: 'destructive' });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="w-4 h-4" />
          Edit Goals
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-lg font-display">Edit Your Goals</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Current Weight (lbs)</Label>
              <Input
                type="number"
                value={form.current_weight}
                onChange={e => setForm(f => ({ ...f, current_weight: e.target.value }))}
                placeholder="180"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Goal Weight (lbs)</Label>
              <Input
                type="number"
                value={form.goal_weight}
                onChange={e => setForm(f => ({ ...f, goal_weight: e.target.value }))}
                placeholder="165"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Height (inches)</Label>
              <Input
                type="number"
                value={form.height}
                onChange={e => setForm(f => ({ ...f, height: e.target.value }))}
                placeholder="70"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Age</Label>
              <Input
                type="number"
                value={form.age}
                onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
                placeholder="30"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Gender</Label>
            <Select value={form.gender} onValueChange={v => setForm(f => ({ ...f, gender: v }))}>
              <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Fitness Level</Label>
            <Select value={form.fitness_level} onValueChange={v => setForm(f => ({ ...f, fitness_level: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Goal</Label>
            <Select value={form.goal_type} onValueChange={v => setForm(f => ({ ...f, goal_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="weight_loss">Weight Loss</SelectItem>
                <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
                <SelectItem value="toning">Toning</SelectItem>
                <SelectItem value="strength">Strength</SelectItem>
                <SelectItem value="general">General Fitness</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSave} disabled={isUpdating} className="w-full gap-2">
            {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
