import { useState } from 'react';
import { useCourts } from '@/hooks/useCourts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const CourtsManagement = () => {
  const { courts, isLoading, createCourt, updateCourt, deleteCourt, isCreating, isUpdating, isDeleting } = useCourts();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCourt, setSelectedCourt] = useState<{ id: string; name: string; description: string | null; is_active: boolean } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
  });

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Erro',
        description: 'O nome da quadra é obrigatório.',
        variant: 'destructive',
      });
      return;
    }

    createCourt(
      {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        is_active: formData.is_active,
      },
      {
        onSuccess: () => {
          setIsCreateDialogOpen(false);
          setFormData({ name: '', description: '', is_active: true });
        },
      }
    );
  };

  const handleEdit = (court: { id: string; name: string; description: string | null; is_active: boolean }) => {
    setSelectedCourt(court);
    setFormData({
      name: court.name,
      description: court.description || '',
      is_active: court.is_active,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!formData.name.trim() || !selectedCourt) {
      toast({
        title: 'Erro',
        description: 'O nome da quadra é obrigatório.',
        variant: 'destructive',
      });
      return;
    }

    updateCourt(
      {
        id: selectedCourt.id,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        is_active: formData.is_active,
      },
      {
        onSuccess: () => {
          setIsEditDialogOpen(false);
          setSelectedCourt(null);
          setFormData({ name: '', description: '', is_active: true });
        },
      }
    );
  };

  const handleDeleteClick = (court: { id: string; name: string }) => {
    setSelectedCourt(court);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!selectedCourt) return;

    deleteCourt(selectedCourt.id, {
      onSuccess: () => {
        setIsDeleteDialogOpen(false);
        setSelectedCourt(null);
      },
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gerenciar Quadras</CardTitle>
          <CardDescription>Carregando...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gerenciar Quadras</h2>
          <p className="text-muted-foreground">
            Gerencie as quadras disponíveis para agendamento. Cada quadra tem sua própria agenda isolada.
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="default"
              className="bg-blue-600 hover:bg-blue-700 text-white !text-white font-semibold shadow-md hover:shadow-lg transition-all border-0 flex items-center gap-2"
              style={{ color: 'white' }}
            >
              <Plus className="h-4 w-4" />
              <span className="text-white">Nova Quadra</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Quadra</DialogTitle>
              <DialogDescription>
                Adicione uma nova quadra ao sistema. Cada quadra terá sua própria agenda isolada.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nome da Quadra *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Quadra 2, Quadra 3..."
                />
              </div>
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição opcional da quadra..."
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Quadra ativa</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                variant="default"
                onClick={handleCreate} 
                disabled={isCreating}
                className="bg-blue-600 hover:bg-blue-700 text-white !text-white font-semibold shadow-md hover:shadow-lg transition-all border-0"
                style={{ color: 'white' }}
              >
                <span className="text-white">{isCreating ? 'Criando...' : 'Criar Quadra'}</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {courts.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Nenhuma quadra cadastrada. Crie sua primeira quadra para começar.
              </p>
            </CardContent>
          </Card>
        ) : (
          courts.map((court) => (
            <Card key={court.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      {court.name}
                    </CardTitle>
                    {court.description && (
                      <CardDescription className="mt-2">{court.description}</CardDescription>
                    )}
                  </div>
                  <div className={`h-3 w-3 rounded-full ${court.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(court)}
                    disabled={isUpdating}
                    className="flex-1"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteClick(court)}
                    disabled={isDeleting}
                    className="flex-1 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialog de Edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Quadra</DialogTitle>
            <DialogDescription>Atualize as informações da quadra.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nome da Quadra *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Quadra 2"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição opcional..."
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="edit-is_active">Quadra ativa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="default"
              onClick={handleUpdate} 
              disabled={isUpdating}
              className="bg-blue-600 hover:bg-blue-700 text-white !text-white font-semibold shadow-md hover:shadow-lg transition-all border-0 min-w-[100px]"
              style={{ color: 'white', backgroundColor: '#2563eb' }}
            >
              <span className="text-white font-medium">{isUpdating ? 'Salvando...' : 'Salvar'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a quadra "{selectedCourt?.name}"? Esta ação não pode ser desfeita.
              <br />
              <br />
              <strong>Nota:</strong> Apenas quadras sem agendamentos futuros podem ser excluídas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm} 
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white !text-white font-semibold shadow-md hover:shadow-lg transition-all border-0 min-w-[100px]"
              style={{ color: 'white', backgroundColor: isDeleting ? '#9ca3af' : '#dc2626' }}
            >
              <span className="text-white font-medium">{isDeleting ? 'Excluindo...' : 'Excluir'}</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CourtsManagement;
