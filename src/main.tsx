import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Aplicar tema antes de renderizar para evitar flash de conteúdo incorreto
const applyInitialTheme = () => {
  const root = document.documentElement;
  const savedTheme = localStorage.getItem('theme');
  
  if (savedTheme === 'dark') {
    root.classList.add('dark');
  } else if (savedTheme === 'light') {
    root.classList.remove('dark');
  } else {
    // Auto: usar preferência do sistema
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
};

// Aplicar tema imediatamente
applyInitialTheme();

createRoot(document.getElementById("root")!).render(<App />);
