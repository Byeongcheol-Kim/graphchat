import { ColorTheme, colorThemes } from '@shared/theme/colors'

export interface ThemeConfig {
  value: ColorTheme
  label: string
  colors: string[]
}

export const themeConfigs: ThemeConfig[] = [
  {
    value: 'default',
    label: '기본',
    colors: Object.values(colorThemes.default),
  },
  {
    value: 'ocean',
    label: '오션',
    colors: Object.values(colorThemes.ocean),
  },
  {
    value: 'forest',
    label: '포레스트',
    colors: Object.values(colorThemes.forest),
  },
  {
    value: 'sunset',
    label: '선셋',
    colors: Object.values(colorThemes.sunset),
  },
  {
    value: 'monochrome',
    label: '모노크롬',
    colors: Object.values(colorThemes.monochrome),
  },
  {
    value: 'calm',
    label: '차분한',
    colors: Object.values(colorThemes.calm),
  },
  {
    value: 'autumn',
    label: '가을',
    colors: Object.values(colorThemes.autumn),
  },
  {
    value: 'pastel',
    label: '파스텔',
    colors: Object.values(colorThemes.pastel),
  },
]