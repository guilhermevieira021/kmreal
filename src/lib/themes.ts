/**
 * Registro de temas. Cada tema é um bloco `[data-theme="<id>"]` em src/app/themes.css que
 * redefine os mesmos tokens CSS; os componentes só usam tokens (bg-primary, text-positive...).
 *
 * Para criar um tema novo:
 *   1. adicione a entrada abaixo;
 *   2. copie um bloco em themes.css e troque os valores (todos os tokens são obrigatórios).
 * O preview em Perfil > Aparência e a troca instantânea passam a funcionar sozinhos.
 */
export const THEMES = [
  {
    id: "verde",
    name: "Verde KmReal",
    description: "Claro e direto. O padrão do app.",
    scheme: "light",
    /** Cor da barra do navegador/sistema no celular */
    browserColor: "#10B981",
  },
  {
    id: "noturna",
    name: "Estrada Noturna",
    description: "Fundo escuro para usar à noite sem ofuscar.",
    scheme: "dark",
    browserColor: "#0B0F0E",
  },
  {
    id: "executivo",
    name: "Executivo",
    description: "Grafite e verde profundo, visual premium.",
    scheme: "light",
    browserColor: "#1F2326",
  },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];
export type Theme = (typeof THEMES)[number];

export const DEFAULT_THEME: ThemeId = "verde";
export const THEME_STORAGE_KEY = "kmreal:theme";

export const isThemeId = (value: unknown): value is ThemeId => THEMES.some((t) => t.id === value);
export const getTheme = (id: ThemeId): Theme => THEMES.find((t) => t.id === id) ?? THEMES[0];

/**
 * Script inline no <head>: aplica o tema salvo ANTES da primeira pintura (sem "piscar"
 * o tema padrão). Precisa ser autossuficiente — roda antes do React.
 */
export const themeInitScript = `(function(){try{var ids=${JSON.stringify(THEMES.map((t) => t.id))};var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(ids.indexOf(t)<0)t=${JSON.stringify(DEFAULT_THEME)};document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;
