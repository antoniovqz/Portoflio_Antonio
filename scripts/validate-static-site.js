const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const htmlFiles = [];
const errors = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules" || entry.name === "outputs" || entry.name === ".agents" || entry.name === ".codex") {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.name.endsWith(".html")) {
      htmlFiles.push(fullPath);
    }
  }
}

function existsFrom(htmlFile, ref) {
  const cleanRef = ref.split("#")[0].split("?")[0];
  if (!cleanRef || cleanRef.startsWith("mailto:") || cleanRef.startsWith("http://") || cleanRef.startsWith("https://")) {
    return true;
  }

  const target = path.resolve(path.dirname(htmlFile), cleanRef);
  return fs.existsSync(target);
}

walk(root);

for (const htmlFile of htmlFiles) {
  const source = fs.readFileSync(htmlFile, "utf8");
  const refs = [...source.matchAll(/\b(?:href|src)="([^"]+)"/g)].map((match) => match[1]);

  for (const ref of refs) {
    if (!existsFrom(htmlFile, ref)) {
      errors.push(`${path.relative(root, htmlFile)} references missing file: ${ref}`);
    }
  }

  if (!source.includes("<meta name=\"viewport\"")) {
    errors.push(`${path.relative(root, htmlFile)} is missing a viewport meta tag`);
  }
}

if (!htmlFiles.length) {
  errors.push("No HTML files found.");
}

if (errors.length) {
  console.error("Static site validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Static site validation passed for ${htmlFiles.length} HTML files.`);
