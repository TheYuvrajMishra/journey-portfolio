import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // The 3D world mutates the three.js scene graph every frame inside
  // useFrame (light colors, uniforms, character joints, particle pools).
  // That is the canonical react-three-fiber pattern and is invisible to
  // React's render model, so the React Compiler purity/immutability rules
  // don't apply there. They stay ON for all HTML/UI code.
  {
    files: ["components/world/**/*.{ts,tsx}", "lib/**/*.ts"],
    rules: {
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);
