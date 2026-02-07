import { body, validationResult, ValidationChain } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware para validar resultados da validação
 */
export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

/**
 * Validação para criação de preferência de pagamento
 */
export const validateCreatePreference: ValidationChain[] = [
  body('owner_id')
    .isUUID()
    .withMessage('owner_id deve ser um UUID válido'),
  body('booking_id')
    .isUUID()
    .withMessage('booking_id deve ser um UUID válido'),
  body('price')
    .isFloat({ min: 0.01 })
    .withMessage('price deve ser um número positivo maior que 0'),
  body('items')
    .optional()
    .isArray()
    .withMessage('items deve ser um array'),
  body('items.*.title')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('title do item deve ser uma string não vazia'),
  body('items.*.quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('quantity deve ser um inteiro positivo'),
  body('items.*.unit_price')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('unit_price deve ser um número positivo'),
  body('return_url')
    .optional()
    .isURL()
    .withMessage('return_url deve ser uma URL válida'),
];

/**
 * Validação para salvar chaves do admin
 */
export const validateAdminKeys: ValidationChain[] = [
  body('prod_access_token')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('prod_access_token é obrigatório'),
  body('public_key')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('public_key é obrigatório'),
  body('webhook_secret')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('webhook_secret é obrigatório'),
];

/**
 * Validação para verificar pagamento
 */
export const validateVerifyPayment: ValidationChain[] = [
  body('payment_id')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('payment_id deve ser uma string não vazia'),
  body('preference_id')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('preference_id deve ser uma string não vazia'),
];
