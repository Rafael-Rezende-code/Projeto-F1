import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Config padrão do Next.js (create-next-app).
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // GlyphPortal é de terceiro e não deve ser alterado. O contador local `characterOffset` é reatribuído dentro
    // de um Array.from síncrono durante o render (inofensivo); a regra do React Compiler acusa como erro.
    files: ["components/ui/glyph-portal.tsx"],
    rules: { "react-hooks/immutability": "off" },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", ".claude/**"]),
]);

export default eslintConfig;
