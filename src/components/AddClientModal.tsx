import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClientAdded: () => void;
}

export const AddClientModal = ({ isOpen, onClose, onClientAdded }: AddClientModalProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [isClientWithoutEmail, setIsClientWithoutEmail] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: 'Erro',
        description: 'Nome é obrigatório',
        variant: 'destructive',
      });
      return;
    }

    // Validar email se não for cliente sem email
    if (!isClientWithoutEmail && !formData.email.trim()) {
      toast({
        title: 'Erro',
        description: 'Email é obrigatório ou marque "Cliente sem email"',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Gerar email único para clientes sem email
      let emailToInsert: string;
      if (isClientWithoutEmail) {
        // Gerar email padronizado: nomedocliente@cliente.local
        const nameSlug = formData.name.trim().toLowerCase().replace(/\s+/g, '');
        emailToInsert = `${nameSlug}@cliente.local`;
      } else {
        emailToInsert = formData.email.trim().toLowerCase() || null;
      }

      const { data, error } = await supabase
        .from('booking_clients')
        .insert({
          name: formData.name.trim(),
          email: emailToInsert,
          phone: formData.phone.trim() || null,
          // Cliente criado pelo admin para agenda específica: não deve ter senha válida de login
          password_hash: null,
          user_id: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Cliente adicionado!',
        description: 'Cliente foi cadastrado com sucesso.',
      });

      // Reset form
      setFormData({ name: '', email: '', phone: '' });
      
      // Notify parent component
      onClientAdded();
      
      // Close modal
      onClose();
    } catch (error: any) {
      toast({
        title: 'Erro ao adicionar cliente',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setFormData({ name: '', email: '', phone: '' });
      setIsClientWithoutEmail(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Cliente</DialogTitle>
        </DialogHeader>
        

        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Nome completo"
              disabled={isLoading}
              required
            />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="email@exemplo.com"
              disabled={isLoading || isClientWithoutEmail}
              className={isClientWithoutEmail ? 'opacity-50' : ''}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="noEmail"
              checked={isClientWithoutEmail}
              onChange={(e) => setIsClientWithoutEmail(e.target.checked)}
              disabled={isLoading}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <Label htmlFor="noEmail" className="text-sm text-gray-700">
              Cliente sem email
            </Label>
          </div>

          <div>
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="(11) 99999-9999"
              disabled={isLoading}
            />
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 sm:flex-none"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.name.trim()}
              className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
              style={{ display: 'block', visibility: 'visible' }}
            >
              {isLoading ? 'Adicionando...' : 'Adicionar Cliente'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
