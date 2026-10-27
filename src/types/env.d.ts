/// <reference types="expo/types" />

declare module 'expo-image' {
  import { ComponentType } from 'react';
  export const Image: ComponentType<any>;
  export default Image;
}

declare module '*.module.css' {
  const content: { [className: string]: string };
  export default content;
}
