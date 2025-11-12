import { defineConfig, Options } from "tsup";

export default defineConfig((options: Options) => ({
  entry: {
    index: "src/index.ts",
    env: "src/env.ts",
    schema: "src/schema/index.ts",
    types: "src/types.ts",
    validations: "src/validations.ts",
  },
  clean: true,
  format: ["cjs", "esm"],
  dts: true,
  ...options,
}));
