import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useSettings } from '@/hooks/useSettings';
import { getBookingLink } from '@/utils/bookingDomain';
import { 
  Link, 
  Copy, 
  Check, 
  ExternalLink, 
  Calendar,
  Settings as SettingsIcon,
  Eye,
  EyeOff
} from 'lucide-react';

export const BookingLinkCard = () => {
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { profile } = useUserProfile();
  const { settings, updateSettings, isUpdating } = useSettings();
  const { toast } = useToast();

  const bookingLink = profile?.username 
    ? getBookingLink(profile.username)
    : null;

  const isOnlineBookingEnabled = settings?.online_booking?.ativo ?? false;

  const handleCopyLink = async () => {
    if (!bookingLink) return;

    try {
      await navigator.clipboard.writeText(bookingLink);
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

  const handleToggleOnlineBooking = async (enabled: boolean) => {
    try {
      await updateSettings({
        online_booking: {
          ...settings?.online_booking,
          ativo: enabled
        }
      });
      
      toast({
        title: enabled ? 'Agendamento online ativado!' : 'Agendamento online desativado!',
        description: enabled 
          ? 'Os clientes agora podem agendar horários online.' 
          : 'O agendamento online foi desativado temporariamente.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao atualizar configurações',
        description: 'Não foi possível alterar o status do agendamento online.',
        variant: 'destructive',
      });
    }
  };

  const handleOpenLink = () => {
    if (bookingLink) {
      window.open(bookingLink, '_blank');
    }
  };

  if (!profile?.username) {
    return (
      <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <Calendar className="w-5 h-5" />
            Link de Agendamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
              <SettingsIcon className="w-8 h-8 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold text-orange-800 mb-2">
                Username não configurado
              </h3>
              <p className="text-orange-700 text-sm">
                Para gerar o link de agendamento, você precisa configurar um username único nas suas configurações.
              </p>
            </div>
            <Button 
              variant="outline" 
              className="border-orange-300 text-orange-700 hover:bg-orange-50"
              onClick={() => window.location.href = '/settings'}
            >
              Ir para Configurações
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-800">
            <Calendar className="w-5 h-5" />
            Link de Agendamento Online
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="text-blue-600 hover:bg-blue-100"
          >
            {showSettings ? <EyeOff className="w-4 h-4" /> : <SettingsIcon className="w-4 h-4" />}
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status do agendamento online */}
        <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-blue-200">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isOnlineBookingEnabled ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="font-medium text-slate-700">
              Agendamento Online {isOnlineBookingEnabled ? 'Ativo' : 'Inativo'}
            </span>
          </div>
          <Switch
            checked={isOnlineBookingEnabled}
            onCheckedChange={handleToggleOnlineBooking}
            disabled={isUpdating}
          />
        </div>

        {/* Link de agendamento */}
        {isOnlineBookingEnabled && (
          <div className="space-y-3">
            <Label className="text-sm font-medium text-slate-700">
              Link para seus clientes:
            </Label>
            <div className="flex gap-2">
              <Input
                value={bookingLink}
                readOnly
                className="bg-white border-blue-200 text-slate-600"
              />
              <Button
                onClick={handleCopyLink}
                variant="outline"
                size="icon"
                className="border-blue-300 text-blue-600 hover:bg-blue-50"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
              <Button
                onClick={handleOpenLink}
                variant="outline"
                size="icon"
                className="border-blue-300 text-blue-600 hover:bg-blue-50"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              Compartilhe este link com seus clientes para que eles possam agendar horários online.
            </p>
          </div>
        )}

        {/* Configurações avançadas */}
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 pt-4 border-t border-blue-200"
          >
            <h4 className="font-medium text-slate-700">Configurações Avançadas</h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Auto-confirmação</Label>
                  <p className="text-xs text-slate-500">
                    Reservas são confirmadas automaticamente
                  </p>
                </div>
                <Switch
                  checked={settings?.online_booking?.auto_agendar ?? false}
                  onCheckedChange={(enabled) => 
                    updateSettings({
                      online_booking: {
                        ...settings?.online_booking,
                        auto_agendar: enabled
                      }
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Tempo mínimo de antecedência (horas)</Label>
                <Input
                  type="number"
                  min="1"
                  max="168"
                  value={settings?.online_booking?.tempo_minimo_antecedencia ?? 24}
                  onChange={(e) => 
                    updateSettings({
                      online_booking: {
                        ...settings?.online_booking,
                        tempo_minimo_antecedencia: parseInt(e.target.value) || 24
                      }
                    })
                  }
                  className="w-32"
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Informações adicionais */}
        <div className="bg-blue-100/50 rounded-xl p-4">
          <h4 className="font-medium text-blue-800 mb-2">Como funciona:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Clientes acessam o link e fazem login/cadastro</li>
            <li>• Escolhem modalidade, data e horário disponível</li>
            <li>• Reserva é criada automaticamente na sua agenda</li>
            <li>• Você recebe notificação da nova reserva</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
