import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useModalities } from '@/hooks/useModalities';
import { formatCurrency, parseCurrencyValue } from '@/utils/currency';
import { ArrowLeft, Plus, Edit, Trash2, DollarSign, Save, X, AlertTriangle } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

const Modalities = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { 
    modalities, 
    isLoading, 
    isCreating, 
    isUpdating, 
    isDeleting,
    createModality, 
    updateModality, 
    deleteModality 
  } = useModalities();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    valor: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.valor.trim()) {
      return;
    }

    const valor = parseCurrencyValue(formData.valor);
    
    if (editingId) {
      await updateModality(editingId, {
        name: formData.name.trim(),
        valor: valor
      });
      setEditingId(null);
    } else {
      await createModality({
        name: formData.name.trim(),
        valor: valor
      });
    }

    setFormData({ name: '', valor: '' });
    setIsAdding(false);
  };

  const handleEdit = (modality: any) => {
    setEditingId(modality.id);
    setFormData({
      name: modality.name,
      valor: modality.valor.toString().replace('.', ',')
    });
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta modalidade?')) {
      await deleteModality(id);
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', valor: '' });
    setIsAdding(false);
    setEditingId(null);
  };

  if (loading || isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <motion.header 
        className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-30 shadow-sm"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/settings')}
                className="hover:bg-slate-100"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <div className="space-y-1">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Modalidades
                </h1>
                <p className="text-slate-600">Gerencie suas modalidades esportivas</p>
              </div>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Nova Modalidade */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-xl rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200/60 p-6">
                <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">
                  <Plus className="h-6 w-6 text-blue-600" />
                  {editingId ? 'Editar Modalidade' : 'Nova Modalidade'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {!isAdding ? (
                  <Button 
                    onClick={() => setIsAdding(true)}
                    className="w-full h-12 text-base font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Adicionar Nova Modalidade
                  </Button>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name" className="text-sm font-medium text-slate-700">
                          Nome da Modalidade
                        </Label>
                        <Input
                          id="name"
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Ex: Futsal, Vôlei, Basquete"
                          className="h-12 text-base border-slate-200 focus:border-blue-300 focus:ring-blue-200 rounded-xl"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="valor" className="text-sm font-medium text-slate-700">
                          Valor (R$)
                        </Label>
                        <Input
                          id="valor"
                          type="text"
                          value={formData.valor}
                          onChange={(e) => setFormData(prev => ({ ...prev, valor: e.target.value }))}
                          placeholder="Ex: 60,00"
                          className="h-12 text-base border-slate-200 focus:border-blue-300 focus:ring-blue-200 rounded-xl"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button 
                        type="submit"
                        disabled={isCreating || isUpdating}
                        className="flex-1 h-12 text-base font-medium bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        {isCreating || isUpdating ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <>
                            <Save className="h-5 w-5 mr-2" />
                            {editingId ? 'Salvar' : 'Adicionar'}
                          </>
                        )}
                      </Button>
                      <Button 
                        type="button"
                        variant="outline"
                        onClick={handleCancel}
                        className="h-12 px-6 text-base font-medium border-slate-200 hover:bg-slate-50 rounded-xl"
                      >
                        <X className="h-5 w-5 mr-2" />
                        Cancelar
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Modalidades Cadastradas */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-xl rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-green-50 border-b border-slate-200/60 p-6">
                <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">
                  <DollarSign className="h-6 w-6 text-green-600" />
                  Modalidades Cadastradas ({modalities.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {modalities.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertTriangle className="h-16 w-16 mx-auto text-slate-300 mb-4" />
                    <p className="text-lg font-medium text-slate-600 mb-2">
                      Nenhuma modalidade cadastrada
                    </p>
                    <p className="text-slate-500 mb-6">
                      Comece adicionando sua primeira modalidade esportiva
                    </p>
                    <Button 
                      onClick={() => setIsAdding(true)}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Primeira Modalidade
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {modalities.map((modality) => (
                      <motion.div
                        key={modality.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="border border-slate-200 rounded-xl p-4 hover:bg-slate-50 transition-all duration-300"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                              <DollarSign className="h-6 w-6 text-white" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-slate-800">
                                {modality.name}
                              </h3>
                              <p className="text-2xl font-bold text-green-600">
                                {formatCurrency(modality.valor)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(modality)}
                              className="border-slate-200 hover:bg-blue-50 hover:border-blue-300"
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(modality.id)}
                              disabled={isDeleting}
                              className="border-slate-200 hover:bg-red-50 hover:border-red-300 text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Modalities;

