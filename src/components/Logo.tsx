import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 64 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Campo de futebol - gramado */}
      <rect
        x="8"
        y="12"
        width="48"
        height="40"
        rx="3"
        fill="#22c55e"
        stroke="currentColor"
        strokeWidth="2"
      />
      
      {/* Linha central */}
      <line x1="32" y1="12" x2="32" y2="52" stroke="white" strokeWidth="2" />
      
      {/* Círculo central */}
      <circle cx="32" cy="32" r="6" fill="none" stroke="white" strokeWidth="2" />
      
      {/* Bola de futebol no centro */}
      <circle cx="32" cy="32" r="2" fill="white" />
    </svg>
  );
};

export default Logo;
