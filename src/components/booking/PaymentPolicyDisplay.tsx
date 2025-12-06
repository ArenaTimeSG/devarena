import { motion } from 'framer-motion';
import { CreditCard, AlertCircle, CheckCircle, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  PaymentPolicy, 
  getPaymentPolicyLabel, 
  getPaymentPolicyDescription,
  isPaymentRequired,
  isPaymentOptional,
  isNoPayment
} from '@/utils/paymentPolicy';

interface PaymentPolicyDisplayProps {
  paymentPolicy: PaymentPolicy;
  valor?: number;
  onPaymentClick?: () => void;
  showPaymentButton?: boolean;
  className?: string;
}

const PaymentPolicyDisplay = ({ 
  paymentPolicy, 
  valor = 0, 
  onPaymentClick, 
  showPaymentButton = true,
  className 
}: PaymentPolicyDisplayProps) => {
  const getPolicyIcon = () => {
    if (isPaymentRequired(paymentPolicy)) return <AlertCircle className="h-5 w-5 text-red-500" />;
    if (isPaymentOptional(paymentPolicy)) return <CreditCard className="h-5 w-5 text-yellow-500" />;
    return <CheckCircle className="h-5 w-5 text-green-500" />;
  };

  const getPolicyBadgeVariant = () => {
    if (isPaymentRequired(paymentPolicy)) return 'destructive';
    if (isPaymentOptional(paymentPolicy)) return 'secondary';
    return 'default';
  };

  const getPolicyColor = () => {
    if (isPaymentRequired(paymentPolicy)) return 'text-red-600';
    if (isPaymentOptional(paymentPolicy)) return 'text-yellow-600';
    return 'text-green-600';
  };

  const shouldShowPayment = () => {
    return isPaymentRequired(paymentPolicy) || isPaymentOptional(paymentPolicy);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-lg border p-4 ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          {getPolicyIcon()}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className={`font-medium ${getPolicyColor()}`}>
                {getPaymentPolicyLabel(paymentPolicy)}
              </h4>
              <Badge variant={getPolicyBadgeVariant()}>
                {paymentPolicy}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {getPaymentPolicyDescription(paymentPolicy)}
            </p>
            
            {/* Mostrar valor se necessário */}
            {shouldShowPayment() && valor > 0 && (
              <div className="flex items-center gap-1 text-sm font-medium text-gray-700">
                <DollarSign className="h-4 w-4" />
                <span>R$ {valor.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Botão de pagamento se aplicável */}
        {showPaymentButton && shouldShowPayment() && (
          <Button
            onClick={onPaymentClick}
            variant={isPaymentRequired(paymentPolicy) ? "default" : "outline"}
            size="sm"
            className="ml-4"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            {isPaymentRequired(paymentPolicy) ? 'Pagar Agora' : 'Pagar (Opcional)'}
          </Button>
        )}
      </div>

      {/* Mensagem adicional baseada na política */}
      {isPaymentRequired(paymentPolicy) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg"
        >
          <p className="text-sm text-blue-700">
            <AlertCircle className="h-4 w-4 inline mr-1" />
            O pagamento é opcional para este agendamento.
          </p>
        </motion.div>
      )}

      {isPaymentOptional(paymentPolicy) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
        >
          <p className="text-sm text-yellow-700">
            <CreditCard className="h-4 w-4 inline mr-1" />
            Você pode escolher pagar agora ou pagar no local.
          </p>
        </motion.div>
      )}

      {isNoPayment(paymentPolicy) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg"
        >
          <p className="text-sm text-green-700">
            <CheckCircle className="h-4 w-4 inline mr-1" />
            Este agendamento não requer pagamento.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default PaymentPolicyDisplay;

