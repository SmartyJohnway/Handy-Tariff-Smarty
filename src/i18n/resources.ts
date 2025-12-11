import enCommon from '@/i18n/locales/en/common.json';
import zhTWCommon from '@/i18n/locales/zh-TW/common.json';

export const resources = {
  en: {
    common: enCommon,
  },
  'zh-TW': {
    common: zhTWCommon,
  },
} as const;

export type SupportedLng = keyof typeof resources;
export type DefaultNamespace = keyof (typeof resources)['en'];

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof enCommon;
    };
  }
}
