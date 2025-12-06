import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { getBookingLink } from '@/utils/bookingDomain';
import { Copy, Link, Check, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

export const LinkCompartilhamento = () => {
  const { user } = useAuth();
  const { profile: userProfile, refetchProfile } = useUserProfile();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  // Forçar refetch do perfil se não estiver carregado
  useEffect(() => {
    if (!userProfile && user) {
      refetchProfile();
    }
  }, [userProfile, user, refetchProfile]);

  const bookingUrl = userProfile?.username 
    ? getBookingLink(userProfile.username)
    : '';

  const handleCopyLink = async () => {
    if (!bookingUrl) {
      toast({
        title: 'Erro',
        description: 'Username não configurado. Configure seu username primeiro.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      toast({
        title: 'Link copiado!',
        description: 'O link de agendamento foi copiado para a área de transferência.',
      });
      
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Erro ao copiar',
        description: 'Não foi possível copiar o link automaticamente.',
        variant: 'destructive',
      });
    }
  };

  const handleOpenLink = () => {
    if (bookingUrl) {
      window.open(bookingUrl, '_blank');
    }
  };

  if (!userProfile?.username) {
    return (
      <Card className="border-orange-200 bg-orange-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <Link className="h-5 w-5" />
            Link de Agendamento
          </CardTitle>
          <CardDescription className="text-orange-700">
            Configure seu username para gerar o link de agendamento online.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 space-y-4">
            <Badge variant="outline" className="text-orange-700 border-orange-300">
              Username não configurado
            </Badge>
            
            <Button
              onClick={() => refetchProfile()}
              variant="outline"
              size="sm"
              className="text-orange-700 border-orange-300"
            >
              Recarregar Perfil
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-green-200 bg-green-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-800">
          <Link className="h-5 w-5" />
          Link de Agendamento
        </CardTitle>
        <CardDescription className="text-green-700">
          Compartilhe este link com seus clientes para permitir agendamentos online.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-green-700 border-green-300">
            Ativo
          </Badge>
          <span className="text-sm text-green-600">
            Username: <strong>{userProfile.username}</strong>
          </span>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-green-800">
            Link de Agendamento:
          </label>
          <div className="flex gap-2">
            <Input
              value={bookingUrl}
              readOnly
              className="bg-white border-green-300 text-green-900"
            />
            <Button
              onClick={handleCopyLink}
              variant="outline"
              size="sm"
              className="border-green-300 text-green-700 hover:bg-green-100"
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            <Button
              onClick={handleOpenLink}
              variant="outline"
              size="sm"
              className="border-green-300 text-green-700 hover:bg-green-100"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 rounded-lg p-4 border border-green-200"
        >
          <h4 className="font-medium text-green-800 mb-2">Como usar:</h4>
          <ul className="text-sm text-green-700 space-y-1">
            <li>• Compartilhe o link com seus clientes</li>
            <li>• Eles poderão escolher modalidades e horários</li>
            <li>• Os agendamentos serão salvos automaticamente</li>
          </ul>
        </motion.div>
      </CardContent>
    </Card>
  );
};
