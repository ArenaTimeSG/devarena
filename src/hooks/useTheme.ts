import { useState, useEffect } from 'react';
import { useSettings } from './useSettings';

export type ThemeMode = 'light' | 'dark' | 'custom' | 'auto';

export interface ThemeConfig {
  mode: ThemeMode;
  primaryColor: string;
  accentColor: string;
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  fontFamily: 'inter' | 'roboto' | 'open-sans';
  animationSpeed: 'slow' | 'normal' | 'fast';
}

const DEFAULT_THEME_CONFIG: ThemeConfig = {
  mode: 'light',
  primaryColor: '#3b82f6',
  accentColor: '#10b981',
  borderRadius: 'md',
  fontFamily: 'inter',
  animationSpeed: 'normal'
};

export const useTheme = () => {
  const { settings, updateTheme } = useSettings();
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(DEFAULT_THEME_CONFIG);

  // Aplicar tema ao documento
  const applyTheme = (config: ThemeConfig) => {
    const root = document.documentElement;
    
    console.log('🎨 Aplicando tema:', config.mode);
    
    // Aplicar modo de tema
    root.classList.remove('light', 'dark');
    if (config.mode === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const themeToApply = prefersDark ? 'dark' : 'light';
      root.classList.add(themeToApply);
      console.log('🎨 Tema automático aplicado:', themeToApply);
    } else {
      root.classList.add(config.mode);
      console.log('🎨 Tema manual aplicado:', config.mode);
    }

    // Aplicar cores personalizadas
    root.style.setProperty('--primary', config.primaryColor);
    root.style.setProperty('--accent', config.accentColor);
    
    // Aplicar border radius
    const borderRadiusMap = {
      none: '0px',
      sm: '0.25rem',
      md: '0.5rem',
      lg: '0.75rem',
      xl: '1rem'
    };
    root.style.setProperty('--radius', borderRadiusMap[config.borderRadius]);
    
    // Aplicar fonte
    const fontFamilyMap = {
      inter: 'Inter, system-ui, sans-serif',
      roboto: 'Roboto, system-ui, sans-serif',
      'open-sans': 'Open Sans, system-ui, sans-serif'
    };
    root.style.setProperty('--font-family', fontFamilyMap[config.fontFamily]);
    
    // Aplicar velocidade de animação
    const animationSpeedMap = {
      slow: '0.5s',
      normal: '0.3s',
      fast: '0.15s'
    };
    root.style.setProperty('--animation-duration', animationSpeedMap[config.animationSpeed]);
  };

  // Aplicar tema diretamente (para uso externo)
  const applyThemeDirectly = (mode: ThemeMode) => {
    const root = document.documentElement;
    
    console.log('🎨 Aplicando tema diretamente:', mode);
    
    // Aplicar modo de tema
    root.classList.remove('light', 'dark');
    if (mode === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const themeToApply = prefersDark ? 'dark' : 'light';
      root.classList.add(themeToApply);
      console.log('🎨 Tema automático aplicado:', themeToApply);
    } else {
      root.classList.add(mode);
      console.log('🎨 Tema manual aplicado:', mode);
    }
  };

  // Atualizar configuração de tema
  const updateThemeConfig = async (newConfig: Partial<ThemeConfig>) => {
    const updatedConfig = { ...themeConfig, ...newConfig };
    setThemeConfig(updatedConfig);
    applyTheme(updatedConfig);
    
    // Salvar no banco de dados
    await updateTheme(updatedConfig.mode);
  };

  // Detectar preferência do sistema
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (themeConfig.mode === 'auto') {
        applyTheme(themeConfig);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themeConfig.mode]);

  // Aplicar tema inicial
  useEffect(() => {
    console.log('🎨 Settings theme:', settings?.theme);
    if (settings?.theme) {
      const config = { ...themeConfig, mode: settings.theme as ThemeMode };
      console.log('🎨 Configurando tema inicial:', config);
      setThemeConfig(config);
      applyTheme(config);
    }
  }, [settings?.theme]);

  return {
    themeConfig,
    updateThemeConfig,
    applyTheme,
    applyThemeDirectly,
    isDark: themeConfig.mode === 'dark' || 
            (themeConfig.mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  };
};


