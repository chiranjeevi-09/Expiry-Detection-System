import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const getInitials = () => {
    if (profile?.display_name) {
      return profile.display_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-card border-b border-border shadow-card z-40">
      <div className="h-full flex items-center justify-between px-4">
        {/* Left - Hamburger Menu */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="text-foreground hover:bg-secondary"
        >
          <Menu className="h-6 w-6" />
        </Button>

        {/* Center - Logo & Title */}
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate('/')}
        >
          <img src="/logo.jpg" alt="EDS Logo" className="h-12 w-auto object-contain" />
        </div>

        {/* Right - Profile Button (Direct Navigation) */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/profile')}
          className="text-foreground hover:bg-secondary rounded-full"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </div>
    </header>
  );
}