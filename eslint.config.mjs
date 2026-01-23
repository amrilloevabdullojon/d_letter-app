import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettierConfig from "eslint-config-prettier/flat";

const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  prettierConfig,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "public/**",
      "scripts/**",
      "dist/**",
    ],
  },
  {
    rules: {
      "no-console": "off",
      "prefer-const": "error",
      "import/no-anonymous-default-export": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@next/next/no-html-link-for-pages": "error",
      "@next/next/no-img-element": "warn",
      "react/no-unescaped-entities": "error",
      "react/jsx-no-comment-textnodes": "error",
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
      "react-hooks/incompatible-library": "off",
    },
  },
  {
    files: [
      "src/components/Header.tsx",
      "src/components/LetterTemplateSelector.tsx",
      "src/components/PWAInstallPrompt.tsx",
      "src/components/examples/TRPCExample.tsx",
      "src/components/ActivityFeed.tsx",
      "src/components/DragDropUpload.tsx",
      "src/components/settings/UsersTab.tsx",
      "src/lib/letter-template-variables.ts",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_", "caughtErrorsIgnorePattern": "^_" },
      ],
    },
  },
];

export default config;
