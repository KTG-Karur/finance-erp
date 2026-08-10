/** @type {import('tailwindcss').Config} */
export default {
  // Deliberately narrow: only the screens that were actually built with
  // Tailwind utility classes and never had Tailwind wired up. Scanning the
  // whole src tree is NOT safe here — this codebase's own SCSS uses plain,
  // short class names (e.g. "table", "hidden", "flex"-like hooks) all over
  // the place for unrelated custom styling, and those coincide with real
  // Tailwind utility names. Generating live CSS for every such match across
  // 100+ components broke the rest of the app's styling; scoping content to
  // exactly the files that need Tailwind avoids that collision entirely.
  content: [
    './src/auth/SuperAdminLoginPage.jsx',
    './src/auth/SuperAdminPortal.jsx',
    './src/App.jsx'
  ],
  corePlugins: {
    preflight: false
  },
  theme: {
    extend: {}
  },
  plugins: []
};
