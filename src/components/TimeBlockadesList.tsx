import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Calendar, Clock, AlertTriangle, Edit, Trash2, Plus, Filter, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTimeBlockades } from '@/hooks/useTimeBlockades';
import { TimeBlockade, BLOCKADE_REASONS } from '@/types/settings';
import TimeBlockadeModal from './TimeBlockadeModal';

interface TimeBlockadesListProps {
  startDate?: string;
  endDate?: string;
}

export default function TimeBlockadesList({ startDate, endDate }: TimeBlockadesListProps) {
  const { useBlockades, deleteBlockade, isDeleting } = useTimeBlockades();
  const { data: blockades = [], isLoading, error } = useBlockades(startDate, endDate);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterReason, setFilterReason] = useState<string>('todos');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedBlockade, setSelectedBlockade] = useState<TimeBlockade | null>(null);

  // Filtrar bloqueios
  const filteredBlockades = blockades.filter((blockade) => {
    const matchesSearch = searchTerm === '' || 
      blockade.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (blockade.description && blockade.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesReason = filterReason === '' || filterReason === 'todos' || blockade.reason === filterReason;
    
    return matchesSearch && matchesReason;
  });

  const handleEditBlockade = (blockade: TimeBlockade) => {
    setSelectedBlockade(blockade);
    setIsEditModalOpen(true);
  };

  const handleDeleteBlockade = async (id: string) => {
    try {
      await deleteBlockade(id);
    } catch (error) {
      console.error('Erro ao deletar bloqueio:', error);
    }
  };

  const getReasonLabel = (reason: string) => {
    const reasonOption = BLOCKADE_REASONS.find(r => r.value === reason);
    return reasonOption ? reasonOption.label : reason;
  };

  const getReasonColor = (reason: string) => {
    switch (reason) {
      case 'manutencao':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'feriado':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'evento':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'limpeza':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'reparo':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Carregando bloqueios...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>Erro ao carregar bloqueios</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bloqueios de Horários</h2>
          <p className="text-gray-600">Gerencie os horários bloqueados da sua agenda</p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-orange-600 hover:bg-orange-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Bloqueio
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por motivo ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
                             <Select value={filterReason || 'todos'} onValueChange={setFilterReason}>
                 <SelectTrigger>
                   <SelectValue placeholder="Filtrar por motivo" defaultValue="todos" />
                 </SelectTrigger>
                                 <SelectContent>
                   <SelectItem value="todos">Todos os motivos</SelectItem>
                   {BLOCKADE_REASONS.map((reason) => (
                     <SelectItem key={reason.value} value={reason.value}>
                       {reason.label}
                     </SelectItem>
                   ))}
                 </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Bloqueios */}
      {filteredBlockades.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {blockades.length === 0 ? 'Nenhum bloqueio encontrado' : 'Nenhum bloqueio corresponde aos filtros'}
            </h3>
            <p className="text-gray-600 mb-4">
              {blockades.length === 0 
                ? 'Crie seu primeiro bloqueio de horário para começar.'
                : 'Tente ajustar os filtros de busca.'
              }
            </p>
            {blockades.length === 0 && (
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Bloqueio
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredBlockades.map((blockade) => (
            <motion.div
              key={blockade.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">
                          {format(new Date(blockade.date), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                        <span className="text-gray-400">•</span>
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">{blockade.time_slot}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge className={getReasonColor(blockade.reason)}>
                          {getReasonLabel(blockade.reason)}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          Criado em {format(new Date(blockade.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      </div>
                      
                      {blockade.description && (
                        <p className="text-sm text-gray-600 mt-2">
                          {blockade.description}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditBlockade(blockade)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja remover este bloqueio? Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteBlockade(blockade.id)}
                              disabled={isDeleting}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              {isDeleting ? 'Removendo...' : 'Remover'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modais */}
      <TimeBlockadeModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        mode="create"
      />
      
      <TimeBlockadeModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedBlockade(null);
        }}
        blockade={selectedBlockade}
        mode="edit"
      />
    </div>
  );
}
