import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Shield, AlertCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface MilitaryLoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogin: () => void;
}

export function MilitaryLoginDialog({ open, onOpenChange, onLogin }: MilitaryLoginDialogProps) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mock authentication - in production this would hit an auth endpoint
    if (formData.username && formData.password) {
      // Accept any non-empty credentials for demo
      onLogin();
      toast.success('Military login successful', {
        description: 'Access granted to tactical operations mode',
        duration: 3000,
      });
      onOpenChange(false);
      
      // Reset form
      setFormData({ username: '', password: '' });
      setError(false);
    } else {
      setError(true);
      toast.error('Login failed', {
        description: 'Please enter valid credentials',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Military Access Login
          </DialogTitle>
          <DialogDescription>
            Authorized personnel only. Enter your credentials to access tactical operations mode.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Invalid credentials. Please check your username and password.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={formData.username}
                onChange={(e) => {
                  setFormData({ ...formData, username: e.target.value });
                  setError(false);
                }}
                placeholder="Enter username"
                required
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  setError(false);
                }}
                placeholder="Enter password"
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                onOpenChange(false);
                setFormData({ username: '', password: '' });
                setError(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              <Shield className="w-4 h-4 mr-2" />
              Login
            </Button>
          </div>
        </form>
        
        <div className="text-muted-foreground text-center pt-2 border-t">
          Demo: Enter any credentials to access military mode
        </div>
      </DialogContent>
    </Dialog>
  );
}
