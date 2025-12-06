import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Check, ChevronDown, Plus, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface ClientSearchDropdownProps {
  clients: Client[];
  selectedClientId: string;
  onClientSelect: (clientId: string) => void;
  onAddNewClient?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const ClientSearchDropdown = ({
  clients,
  selectedClientId,
  onClientSelect,
  onAddNewClient,
  placeholder = "Digite para buscar...",
  disabled = false,
  className
}: ClientSearchDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedClient = clients.find(client => client.id === selectedClientId);

  // Filtrar clientes baseado no termo de busca
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredClients([]);
      return;
    }

    const filtered = clients.filter(client =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone?.includes(searchTerm)
    );
    setFilteredClients(filtered);
  }, [searchTerm, clients]);

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClientSelect = (client: Client) => {
    onClientSelect(client.id);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClearSelection = () => {
    onClientSelect('');
    setSearchTerm('');
  };

  const handleInputClick = () => {
    setIsOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <Label className="text-sm font-medium text-gray-700 mb-2 block">
        Cliente *
      </Label>
      
      <div className="relative">
                 <Input
           type="text"
           placeholder={placeholder}
           value={isOpen ? searchTerm : (selectedClient?.name || '')}
           onChange={handleInputChange}
           onClick={handleInputClick}
           disabled={disabled}
           className="pr-10 cursor-pointer"
         />
        
                 <div className="absolute inset-y-0 right-0 flex items-center pr-3">
           {selectedClientId && !isOpen && (
             <Button
               type="button"
               variant="ghost"
               size="sm"
               onClick={handleClearSelection}
               className="h-6 w-6 p-0 hover:bg-gray-100"
             >
               <X className="h-4 w-4" />
             </Button>
           )}
           {(!selectedClientId || isOpen) && (
             <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
           )}
         </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {/* Barra de busca dentro do dropdown */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Digite para buscar..."
                value={searchTerm}
                onChange={handleInputChange}
                className="pl-10"
                autoFocus
              />
            </div>
          </div>

          {/* Lista de clientes */}
          <div className="py-1">
            {filteredClients.length > 0 ? (
              filteredClients.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => handleClientSelect(client)}
                  className={cn(
                    "w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none",
                    selectedClientId === client.id && "bg-blue-50 text-blue-700"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{client.name}</div>
                      {(client.email || client.phone) && (
                        <div className="text-sm text-gray-500">
                          {client.email && client.phone 
                            ? `${client.email} • ${client.phone}`
                            : client.email || client.phone
                          }
                        </div>
                      )}
                    </div>
                    {selectedClientId === client.id && (
                      <Check className="h-4 w-4 text-blue-600" />
                    )}
                  </div>
                </button>
              ))
            ) : searchTerm ? (
              <div className="px-4 py-2 text-gray-500 text-sm">
                Nenhum cliente encontrado
              </div>
            ) : (
              <div className="px-4 py-2 text-gray-500 text-sm">
                Digite para buscar clientes
              </div>
            )}

            {/* Botão para adicionar novo cliente */}
            {onAddNewClient && (
              <div className="border-t border-gray-200 mt-1">
                <button
                  type="button"
                  onClick={() => {
                    onAddNewClient();
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none text-blue-600"
                >
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    <span className="font-medium">Adicionar Cliente</span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
