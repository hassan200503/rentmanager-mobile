import { useColorScheme } from 'react-native';

/**
 * RentManager mobile tokens. Colours are checked for WCAG AA against their
 * paired surface (text >= 4.5:1, large text/icons >= 3:1) in both schemes.
 */

const palette = {
  green900: '#0B2E22',
  green800: '#0F3D2E',
  green700: '#145C43',
  green600: '#1A7355',
  green100: '#DDF1E8',
  amber700: '#8A5A00',
  amber100: '#FDF0D5',
  red700: '#A8261B',
  red100: '#FBE3E0',
  blue700: '#1F4E8C',
  blue100: '#E1ECFA',
  gray950: '#0E1113',
  gray900: '#161A1D',
  gray800: '#23292E',
  gray700: '#3A4249',
  gray500: '#6B747C',
  gray400: '#8C959D',
  gray300: '#C9CFD4',
  gray200: '#E3E7EA',
  gray100: '#F2F4F5',
  white: '#FFFFFF',
};

export interface Theme {
  dark: boolean;
  color: {
    background: string;
    surface: string;
    surfaceMuted: string;
    border: string;
    text: string;
    textMuted: string;
    textInverse: string;
    primary: string;
    primaryPressed: string;
    onPrimary: string;
    success: string;
    successBg: string;
    warning: string;
    warningBg: string;
    danger: string;
    dangerBg: string;
    info: string;
    infoBg: string;
    focus: string;
  };
  space: (n: number) => number;
  radius: { sm: number; md: number; lg: number; pill: number };
  font: {
    title: { fontSize: number; lineHeight: number; fontWeight: '700' };
    heading: { fontSize: number; lineHeight: number; fontWeight: '600' };
    body: { fontSize: number; lineHeight: number; fontWeight: '400' };
    bodyStrong: { fontSize: number; lineHeight: number; fontWeight: '600' };
    caption: { fontSize: number; lineHeight: number; fontWeight: '400' };
    figure: { fontSize: number; lineHeight: number; fontWeight: '700' };
  };
  /** Minimum interactive size, per Apple HIG (44pt) and Material (48dp). */
  touchTarget: number;
}

const base = {
  space: (n: number) => n * 4,
  radius: { sm: 8, md: 12, lg: 16, pill: 999 },
  font: {
    title: { fontSize: 26, lineHeight: 32, fontWeight: '700' as const },
    heading: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const },
    body: { fontSize: 16, lineHeight: 22, fontWeight: '400' as const },
    bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: '600' as const },
    caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
    figure: { fontSize: 32, lineHeight: 38, fontWeight: '700' as const },
  },
  touchTarget: 48,
};

export const lightTheme: Theme = {
  ...base,
  dark: false,
  color: {
    background: palette.gray100,
    surface: palette.white,
    surfaceMuted: palette.gray100,
    border: palette.gray200,
    text: palette.gray950,
    textMuted: palette.gray700,
    textInverse: palette.white,
    primary: palette.green800,
    primaryPressed: palette.green900,
    onPrimary: palette.white,
    success: palette.green700,
    successBg: palette.green100,
    warning: palette.amber700,
    warningBg: palette.amber100,
    danger: palette.red700,
    dangerBg: palette.red100,
    info: palette.blue700,
    infoBg: palette.blue100,
    focus: palette.blue700,
  },
};

export const darkTheme: Theme = {
  ...base,
  dark: true,
  color: {
    background: palette.gray950,
    surface: palette.gray900,
    surfaceMuted: palette.gray800,
    border: palette.gray800,
    text: palette.gray100,
    textMuted: palette.gray400,
    textInverse: palette.gray950,
    primary: '#4FC79A',
    primaryPressed: '#3AAE83',
    onPrimary: palette.gray950,
    success: '#6FD6AE',
    successBg: '#12352A',
    warning: '#F3C465',
    warningBg: '#3A2C0C',
    danger: '#FF9A8F',
    dangerBg: '#3E1612',
    info: '#8DB8F0',
    infoBg: '#172A44',
    focus: '#8DB8F0',
  },
};

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? darkTheme : lightTheme;
}
