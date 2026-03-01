import { useState, useRef } from 'react';
import { User, Mail, Save, LogOut, Phone, Upload } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
export default function Profile() {
  const {
    user,
    profile,
    updateProfile,
    signOut
  } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [mobileNumber, setMobileNumber] = useState(profile?.mobile_number || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      await updateProfile({ avatar_url: publicUrl });
      toast.success('Profile photo updated!');
    } catch (err) {
      toast.error('Failed to upload photo');
    } finally {
      setIsUploading(false);
    }
  };
  const getInitials = () => {
    if (displayName) {
      return displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };
  const handleSave = async () => {
    setIsLoading(true);
    try {
      const {
        error
      } = await updateProfile({
        display_name: displayName || null,
        avatar_url: avatarUrl || null,
        mobile_number: mobileNumber || null
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Profile updated successfully');
      }
    } catch (err) {
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };
  return <div className="space-y-6">
    {/* Page Header */}
    <div className="flex items-center gap-3">
      <div className="gradient-primary p-3 rounded-xl">
        <User className="h-6 w-6 text-primary-foreground" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="text-muted-foreground">Manage your account settings</p>
      </div>
    </div>

    {/* Profile Card */}
    <Card className="p-6 shadow-card">
      <div className="space-y-6">
        {/* Avatar Section - Click to Upload */}
        <div className="flex flex-col items-center gap-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAvatarUpload}
            accept="image/*"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative group"
            disabled={isUploading}
          >
            <Avatar className="h-24 w-24">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Upload className="h-6 w-6 text-white" />
            </div>
          </button>
          <p className="text-sm text-muted-foreground">
            {isUploading ? 'Uploading...' : 'Tap to change photo'}
          </p>
        </div>

        {/* Email (Read Only) */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-foreground flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Address
          </Label>
          <Input id="email" type="email" value={user?.email || ''} disabled className="bg-muted" />
          <p className="text-xs text-muted-foreground">
            Email cannot be changed
          </p>
        </div>

        {/* Display Name */}
        <div className="space-y-2">
          <Label htmlFor="displayName" className="text-foreground flex items-center gap-2">
            <User className="h-4 w-4" />
            Display Name
          </Label>
          <Input id="displayName" type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Enter your display name" />
        </div>

        {/* Mobile Number */}
        <div className="space-y-2">
          <Label htmlFor="mobileNumber" className="text-foreground flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Mobile Number
          </Label>
          <Input
            id="mobileNumber"
            type="tel"
            value={mobileNumber}
            onChange={e => setMobileNumber(e.target.value)}
            placeholder="Enter your mobile number"
          />
        </div>

        {/* Account Created */}
        <div className="pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Account created: {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
          </p>
        </div>

        {/* Save Button */}
        <Button onClick={handleSave} disabled={isLoading} className="w-full gradient-primary text-primary-foreground">
          {isLoading ? <>
            <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
            Saving...
          </> : <>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </>}
        </Button>

        {/* Sign Out Button */}
        <Button
          onClick={signOut}
          variant="outline"
          className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </Card>
  </div>;
}