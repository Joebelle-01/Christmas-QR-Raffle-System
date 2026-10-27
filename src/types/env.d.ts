/// <reference types="expo/types" />

declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_GOOGLE_CLIENT_ID?: string;
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?: string;
    EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?: string;
    EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?: string;
    EXPO_PUBLIC_SHEET_WEBHOOK_URL?: string;
    EXPO_PUBLIC_GOOGLE_SHEET_URL?: string;
  }
}

declare module 'expo-image' {
  import { ComponentType } from 'react';
  export const Image: ComponentType<any>;
  export default Image;
}

declare module '*.module.css' {
  const content: { [className: string]: string };
  export default content;
}
