import { useParams } from 'react-router-dom';

const TestBooking = () => {
  const { username } = useParams<{ username: string }>();
  
  console.log('TestBooking - username from params:', username);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center">
      <div className="text-center space-y-4 max-w-md mx-auto p-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <span className="text-2xl">🎯</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800">Teste de Rota Funcionando!</h2>
        <p className="text-slate-600">
          Username recebido: <strong>{username || 'Nenhum'}</strong>
        </p>
        <div className="bg-green-50 rounded-lg p-4 text-sm text-green-800">
          <p><strong>Status:</strong> ✅ Rota funcionando perfeitamente</p>
          <p><strong>URL:</strong> {window.location.href}</p>
          <p><strong>Timestamp:</strong> {new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

export default TestBooking;
