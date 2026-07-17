import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const portalRoot = resolve(scriptDir, "..");
const publicRoot = resolve(portalRoot, "public");
const distRoot = resolve(portalRoot, "dist");
const productionOrigin = "https://game-portal-4nw.pages.dev";
const sitemapOnly = process.argv.includes("--sitemap-only");

function propertyName(node) {
  if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) {
    return node.text;
  }
  throw new Error(`Unsupported property name: ${node.getText()}`);
}

function literalValue(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literalValue);
  if (ts.isObjectLiteralExpression(node)) {
    return Object.fromEntries(node.properties.map((entry) => {
      if (!ts.isPropertyAssignment(entry)) {
        throw new Error(`Unsupported object entry: ${entry.getText()}`);
      }
      return [propertyName(entry.name), literalValue(entry.initializer)];
    }));
  }
  if (ts.isAsExpression(node) || ts.isParenthesizedExpression(node)) return literalValue(node.expression);
  throw new Error(`Unsupported literal expression: ${node.getText()}`);
}

function readExportedConstant(filePath, exportName) {
  const sourceText = readFileSync(filePath, "utf8");
  const source = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let initializer;

  source.forEachChild((node) => {
    if (!ts.isVariableStatement(node)) return;
    for (const declaration of node.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.name.text === exportName) {
        initializer = declaration.initializer;
      }
    }
  });

  if (!initializer) throw new Error(`Could not find ${exportName} in ${filePath}`);
  return literalValue(initializer);
}

const games = readExportedConstant(resolve(portalRoot, "src", "games", "gamesRegistry.ts"), "games");
const translations = readExportedConstant(resolve(portalRoot, "src", "games", "gameTranslations.ts"), "gameTranslations");
const availableGames = games.filter((game) => game.status !== "coming-soon");
const portalGames = availableGames.filter((game) => game.kind === "internal" || game.id === "yonmai-mahjong");

function portalPath(game) {
  return `/play/${encodeURIComponent(game.id)}/`;
}

function xmlEscape(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function htmlEscape(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function sitemapUrl(pathname) {
  return `  <url><loc>${xmlEscape(`${productionOrigin}${pathname}`)}</loc></url>`;
}

const sitemapPaths = [
  "/",
  ...portalGames.map(portalPath),
  "/games/random-shogi/",
  "/games/yonmai-mahjong/",
  "/privacy.html"
];
const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...sitemapPaths.map(sitemapUrl),
  "</urlset>",
  ""
].join("\n");

writeFileSync(resolve(publicRoot, "sitemap.xml"), sitemap, "utf8");

if (sitemapOnly) {
  console.log(`Generated sitemap with ${sitemapPaths.length} URLs.`);
  process.exit(0);
}

const builtIndexPath = resolve(distRoot, "index.html");
if (!existsSync(builtIndexPath)) {
  throw new Error("dist/index.html is missing. Build the portal before generating search pages.");
}

writeFileSync(resolve(distRoot, "sitemap.xml"), sitemap, "utf8");
const baseHtml = readFileSync(builtIndexPath, "utf8");

function replaceMeta(html, attribute, key, content) {
  const pattern = new RegExp(`<meta\\s+${attribute}=["']${key}["'][^>]*>`, "i");
  const replacement = `<meta ${attribute}="${key}" content="${htmlEscape(content)}" />`;
  return pattern.test(html) ? html.replace(pattern, replacement) : html.replace("</head>", `    ${replacement}\n  </head>`);
}

for (const game of portalGames) {
  const english = translations[game.id]?.en;
  if (!english) throw new Error(`Missing English SEO translation for ${game.id}`);

  const pathname = portalPath(game);
  const canonicalUrl = `${productionOrigin}${pathname}`;
  const imageUrl = `${productionOrigin}${game.screenshot}`;
  const pageTitle = `Play ${english.title} Online | Game Shelf`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: english.title,
    description: english.description,
    url: canonicalUrl,
    image: imageUrl,
    applicationCategory: "Game",
    operatingSystem: "Any",
    inLanguage: ["en", "ja"],
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD"
    }
  };

  let html = baseHtml.replace(/<html\s+lang=["'][^"']+["']>/i, '<html lang="en">');
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${htmlEscape(pageTitle)}</title>`);
  html = replaceMeta(html, "name", "description", english.description);
  html = replaceMeta(html, "name", "robots", "index,follow");
  html = replaceMeta(html, "property", "og:type", "website");
  html = replaceMeta(html, "property", "og:title", pageTitle);
  html = replaceMeta(html, "property", "og:description", english.description);
  html = replaceMeta(html, "property", "og:url", canonicalUrl);
  html = replaceMeta(html, "property", "og:image", imageUrl);
  html = replaceMeta(html, "name", "twitter:title", pageTitle);
  html = replaceMeta(html, "name", "twitter:description", english.description);
  html = replaceMeta(html, "name", "twitter:image", imageUrl);
  html = html.replace(
    /<link\s+rel=["']canonical["'][^>]*>/i,
    `<link rel="canonical" href="${htmlEscape(canonicalUrl)}" />`
  );
  html = html.replace(
    "</head>",
    `    <script type="application/ld+json">${JSON.stringify(structuredData).replaceAll("<", "\\u003c")}</script>\n  </head>`
  );

  const outputDirectory = resolve(distRoot, "play", game.id);
  mkdirSync(outputDirectory, { recursive: true });
  writeFileSync(resolve(outputDirectory, "index.html"), html, "utf8");
}

const mascotTestPath = "/test/color-chain-mascot/";
const mascotTestCanonicalUrl = `${productionOrigin}${mascotTestPath}`;
const mascotTestTitle = "Chroma's Magical Chain Test | Game Shelf";
const mascotTestDescription = "A publicly accessible test version of Magical Chain for mascot character and presentation experiments.";

let mascotTestHtml = baseHtml.replace(/<html\s+lang=["'][^"']+["']>/i, '<html lang="en">');
mascotTestHtml = mascotTestHtml.replace(/<title>[^<]*<\/title>/i, `<title>${htmlEscape(mascotTestTitle)}</title>`);
mascotTestHtml = replaceMeta(mascotTestHtml, "name", "description", mascotTestDescription);
mascotTestHtml = replaceMeta(mascotTestHtml, "name", "robots", "noindex,nofollow");
mascotTestHtml = replaceMeta(mascotTestHtml, "property", "og:title", mascotTestTitle);
mascotTestHtml = replaceMeta(mascotTestHtml, "property", "og:description", mascotTestDescription);
mascotTestHtml = replaceMeta(mascotTestHtml, "property", "og:url", mascotTestCanonicalUrl);
mascotTestHtml = replaceMeta(mascotTestHtml, "property", "og:image", `${productionOrigin}/screenshots/color-chain.svg`);
mascotTestHtml = replaceMeta(mascotTestHtml, "name", "twitter:title", mascotTestTitle);
mascotTestHtml = replaceMeta(mascotTestHtml, "name", "twitter:description", mascotTestDescription);
mascotTestHtml = replaceMeta(mascotTestHtml, "name", "twitter:image", `${productionOrigin}/screenshots/color-chain.svg`);
mascotTestHtml = mascotTestHtml.replace(
  /<link\s+rel=["']canonical["'][^>]*>/i,
  `<link rel="canonical" href="${htmlEscape(mascotTestCanonicalUrl)}" />`
);

const mascotTestOutputDirectory = resolve(distRoot, mascotTestPath.replace(/^\/+|\/+$/g, ""));
mkdirSync(mascotTestOutputDirectory, { recursive: true });
writeFileSync(resolve(mascotTestOutputDirectory, "index.html"), mascotTestHtml, "utf8");

console.log(`Generated ${portalGames.length} search landing pages, 1 mascot test page, and ${sitemapPaths.length} sitemap URLs.`);
