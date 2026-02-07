import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Interface para o payload do JWT
interface JwtPayload {
  userId: string;
  email?: string;
}

// Estender o tipo Request para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Middleware de autenticação JWT
 * Valida o token JWT no header Authorization
 */
export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Token de autenticação não fornecido'
    });
    return;
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('❌ JWT_SECRET não configurado');
    res.status(500).json({
      success: false,
      error: 'Erro de configuração do servidor'
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        error: 'Token expirado'
      });
      return;
    }
    
    if (error.name === 'JsonWebTokenError') {
      res.status(403).json({
        success: false,
        error: 'Token inválido'
      });
      return;
    }

    console.error('❌ Erro ao verificar token:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao verificar token'
    });
  }
};

/**
 * Middleware opcional - permite acesso se autenticado, mas não bloqueia se não estiver
 * Útil para rotas que funcionam com ou sem autenticação
 */
export const optionalAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret) {
      try {
        const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
        req.user = decoded;
      } catch (error) {
        // Ignora erros de token inválido para rotas opcionais
      }
    }
  }

  next();
};
