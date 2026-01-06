// Vitest setup: polyfill matchMedia and provide basic envs for tests
Object.defineProperty(window, 'matchMedia', {
  value: (query: string) => {
    return {
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false
    }
  }
})

// Provide minimal env vars used by supabase client during tests
process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://localhost'
process.env.VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'anon'
