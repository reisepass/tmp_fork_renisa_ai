#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { minimatch } = require("minimatch");

// Default ignores
const DEFAULT_IGNORES = [
  "**/.next", // Next.js build output and cache
  "**/.turbo", // Turborepo cache and logs
  "**/.mastra", // Your API's build output folder
  "**/dist", // Generic build output directory

  "**/node_modules",
  "**/tmp",
  "**/.git",
  "**/.github",
  "**/.idea",
  "**/.vscode",
  "**/.DS_Store",
  "**/package-lock.json",
  "**/public",
  "**/dist",
  "**/.env",
  // Project-specific ignores for print-project command
  "**/packages",
  "**/components/ui",
  // "**/components/**",
  "pnpm-lock.yaml",
  "apps/web/app/favicon.ico",
  ".dockerignore",
  ".gitignore",
  ".prettierignore",
  ".prettierrc",
  ".tool-versions",
  "apps/web/message-circle.svg",
];

// Define command line options
const OPTIONS = {
  "-i": { hasValue: true, description: "Specify directories/files to ignore" },
  "--ignore": {
    hasValue: true,
    description: "Specify directories/files to ignore",
  },
  "-p": { hasValue: false, description: "Print content of files" },
  "--print": { hasValue: false, description: "Print content of files" },
  "-d": { hasValue: false, description: "List directories only" },
  "--dirs": { hasValue: false, description: "List directories only" },
  "-h": { hasValue: false, description: "Show help" },
  "--help": { hasValue: false, description: "Show help" },
};

// Parse command line arguments
function parseArgs(args) {
  const options = {
    ignore: [...DEFAULT_IGNORES],
    printContent: false,
    dirsOnly: false,
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === "-h" || arg === "--help") {
      showHelp();
      process.exit(0);
    } else if (arg === "-i" || arg === "--ignore") {
      if (i + 1 < args.length) {
        // Add user specified ignores to defaults
        const userIgnores = args[i + 1].split(",");
        options.ignore = [...DEFAULT_IGNORES, ...userIgnores];
        i += 2;
      } else {
        console.error(
          `Error: ${arg} requires a comma-separated list of directories/files`
        );
        process.exit(1);
      }
    } else if (arg === "-p" || arg === "--print") {
      options.printContent = true;
      i++;
    } else if (arg === "-d" || arg === "--dirs") {
      options.dirsOnly = true;
      i++;
    } else {
      console.error(`Unknown option: ${arg}`);
      showHelp();
      process.exit(1);
    }
  }

  return options;
}

// Show help information
function showHelp() {
  console.log("List directories or files, with optional exclusions");
  console.log("Usage: pf [-i|--ignore dir1,dir2,...] [-p|--print] [-d|--dirs]");
  console.log("Examples:");
  console.log("  pf -d                  # list all directories");
  console.log(
    "  pf -i tmp,cache        # list files, excluding specified dirs"
  );
  console.log("  pf -i assets/builds    # exclude path pattern");
  console.log("  pf -i tmp,cache -p     # list and print content");
  console.log("\nDefault ignores: " + DEFAULT_IGNORES.join(", "));
  console.log(
    "Note: Using -i adds to default ignores rather than replacing them."
  );
}

// Check if a path should be ignored
function shouldIgnore(itemPath, ignorePatterns) {
  const relativePath = itemPath.startsWith("./") ? itemPath.slice(2) : itemPath;

  for (const pattern of ignorePatterns) {
    if (minimatch(relativePath, pattern, { matchBase: true, dot: true })) {
      return true;
    }
  }

  return false;
}

// Determine if a file is binary
function isBinaryFile(filePath) {
  try {
    // Read the first few bytes of the file
    const fd = fs.openSync(filePath, "r");
    const buffer = Buffer.alloc(4096);
    const bytesRead = fs.readSync(fd, buffer, 0, 4096, 0);
    fs.closeSync(fd);

    // Check for null bytes in the buffer
    for (let i = 0; i < bytesRead; i++) {
      if (buffer[i] === 0) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error(`Error reading file ${filePath}: ${error.message}`);
    return true; // Assume binary if can't read
  }
}

// List all files or directories
function listItems(options, currentPath = ".", depth = 0) {
  if (depth === 0 && options.dirsOnly) {
    console.log("."); // Include current directory in directory listings
  }

  try {
    const items = fs.readdirSync(currentPath);

    for (const item of items) {
      const itemPath = path.join(currentPath, item);
      const stats = fs.statSync(itemPath);

      // Skip ignored paths
      if (shouldIgnore(itemPath, options.ignore)) {
        continue;
      }

      if (stats.isDirectory()) {
        if (options.dirsOnly) {
          console.log(itemPath);
        }

        // Recursively list items in subdirectories
        listItems(options, itemPath, depth + 1);
      } else if (stats.isFile() && !options.dirsOnly) {
        if (options.printContent) {
          console.log(`\n=== ${itemPath} ===`);
          if (isBinaryFile(itemPath)) {
            console.log("[binary file]");
          } else {
            try {
              const content = fs.readFileSync(itemPath, "utf8");
              console.log(content);
            } catch (error) {
              console.log(`[error reading file: ${error.message}]`);
            }
          }
        } else {
          console.log(itemPath);
        }
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${currentPath}: ${error.message}`);
  }
}

// Main function
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // No arguments, just list files with default ignores
    listItems({
      ignore: DEFAULT_IGNORES,
      printContent: false,
      dirsOnly: false,
    });
  } else {
    const options = parseArgs(args);
    listItems(options);
  }
}

// Run the program
main();
