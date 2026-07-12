import { useEffect, useState } from 'react';
import * as api from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

export default function Terms({ onAccepted }: { onAccepted: () => void }) {
  const { logout } = useAuthStore();
  const [text, setText] = useState('');
  const [version, setVersion] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const result = await api.getTermsText();
      setText(result.text);
      setVersion(result.version);
    })();
  }, []);

  const handleAccept = async () => {
    if (!version) return;
    setAccepting(true);
    setError(null);
    try {
      await api.acceptTerms(version);
      onAccepted();
    } catch {
      setError('Could not record your acceptance. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-lg">Monitoring Terms &amp; Conditions</CardTitle>
        <CardDescription>Please review and accept before your activity monitoring starts.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="bg-muted text-muted-foreground max-h-80 overflow-y-auto whitespace-pre-wrap rounded-lg border p-4 text-sm leading-relaxed">
          {text || 'Loading…'}
        </div>

        {error && <p className="text-destructive text-xs">{error}</p>}

        <Button onClick={handleAccept} disabled={!version || accepting}>
          {accepting ? 'Accepting…' : 'I Accept'}
        </Button>
        <Button variant="secondary" className="w-full" onClick={() => logout()}>
          Sign Out Instead
        </Button>
      </CardContent>
    </Card>
  );
}
