/// <reference types="vite/client" />

// Provide minimal JSX typings to avoid TypeScript errors when types are not yet installed
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

// Provide a minimal declaration for the automatic JSX runtime if types aren't resolved yet
declare module 'react/jsx-runtime' {
  export function jsx(type: any, props: any, key?: any): any;
  export function jsxs(type: any, props: any, key?: any): any;
  export function jsxDEV(type: any, props: any, key?: any): any;
}

export {}
