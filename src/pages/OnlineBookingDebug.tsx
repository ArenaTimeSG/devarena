import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAdminByUsername } from '@/hooks/useAdminByUsername';

const OnlineBookingDebug = () => {
  const { username } = useParams<{ username: string }>();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  
  const { 
    data: adminData, 
    isLoading: loadingAdmin, 
    error: adminError 
  } = useAdminByUsername(username || '');

  const handleDebug = () => {
    setDebugInfo({
      username,
      adminData,
      loadingAdmin,
      adminError,
      timestamp: new Date().toISOString()
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Debug - Agendamento Online</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Informações Básicas</h2>
          <div className="space-y-2">
            <p><strong>Username:</strong> {username}</p>
            <p><strong>Loading:</strong> {loadingAdmin ? 'Sim' : 'Não'}</p>
            <p><strong>Error:</strong> {adminError ? adminError.message : 'Nenhum'}</p>
          </div>
        </div>

        {adminData && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Dados do Admin</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
              {JSON.stringify(adminData, null, 2)}
            </pre>
          </div>
        )}

        {adminError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-red-800">Erro</h2>
            <pre className="bg-red-100 p-4 rounded overflow-auto text-sm text-red-800">
              {JSON.stringify(adminError, null, 2)}
            </pre>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Ações</h2>
          <button
            onClick={handleDebug}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Capturar Debug Info
          </button>
        </div>

        {debugInfo && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Debug Info</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnlineBookingDebug;
