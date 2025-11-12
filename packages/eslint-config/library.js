/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ["./index.js"],
  rules: {
    // Library-specific rules
    "@typescript-eslint/explicit-function-return-type": "error",
    "@typescript-eslint/explicit-module-boundary-types": "error",
    "prefer-const": "error",
    "no-var": "error",
  },
};
