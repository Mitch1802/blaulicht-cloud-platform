import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const appRoot = path.join(root, 'src', 'app');
const catalogPath = path.join(appRoot, 'imr-ui-library', 'imr-element-catalog.json');

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const allowedMat = new Set(catalog.matElements || []);
const allowedClasses = new Set(catalog.layoutClasses || []);
const allowedActionIcons = new Set((catalog.actionIcons || []).map((icon) => String(icon).trim()).filter(Boolean));

const htmlFiles = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.html')) {
      htmlFiles.push(full);
    }
  }
};

walk(appRoot);

const foundMat = new Set();
const foundTrackedClasses = new Set();
const actionColumnViolations = [];
const materialButtonSpacingViolations = [];
const actionColorViolations = [];
const actionIconViolations = [];
const actionIconAllowlistViolations = [];

const matRegex = /<(mat-[a-z0-9-]+)/gi;
const classRegex = /class\s*=\s*"([^"]+)"/gi;

for (const file of htmlFiles) {
  const content = fs.readFileSync(file, 'utf8');

  for (const match of content.matchAll(matRegex)) {
    foundMat.add(match[1].toLowerCase());
  }

  for (const match of content.matchAll(classRegex)) {
    const classes = match[1]
      .split(/\s+/)
      .map((cls) => cls.trim())
      .filter(Boolean);

    for (const cls of classes) {
      if (cls.startsWith('ui-') || cls.startsWith('imr-') || allowedClasses.has(cls)) {
        foundTrackedClasses.add(cls);
      }
    }
  }

  const actionBlocks = content.match(/<ng-container\s+matColumnDef=["']actions["'][\s\S]*?<\/ng-container>/gi) || [];

  for (const block of actionBlocks) {
    const tdTagMatch =
      block.match(/<td[^>]*mat-cell[^>]*\*matCellDef=\"let element\"[^>]*>/i) ||
      block.match(/<td[^>]*\*matCellDef=\"let element\"[^>]*mat-cell[^>]*>/i);

    if (!tdTagMatch) {
      continue;
    }

    const tdTag = tdTagMatch[0];
    const hasStandardActionClass = /class\s*=\s*"[^"]*\bimr-action-cell\b[^"]*"/i.test(tdTag);

    if (!hasStandardActionClass) {
      actionColumnViolations.push(path.relative(root, file));
      break;
    }

    const buttonBlocks = block.match(/<button\b[\s\S]*?<\/button>/gi) || [];
    for (const buttonBlock of buttonBlocks) {
      const isMaterialActionButton = /\bmat-(flat-button|icon-button|stroked-button|raised-button|button)\b/i.test(buttonBlock);
      if (!isMaterialActionButton) {
        continue;
      }

      const colorMatch = buttonBlock.match(/\bcolor\s*=\s*"([^"]+)"/i);
      const color = colorMatch ? colorMatch[1].toLowerCase() : '';
      if (!['primary', 'warn'].includes(color)) {
        actionColorViolations.push({
          file: path.relative(root, file),
          snippet: buttonBlock.replace(/\s+/g, ' ').trim(),
        });
      }

      const hasIcon = /<mat-icon\b[^>]*>[\s\S]*?<\/mat-icon>/i.test(buttonBlock);
      if (!hasIcon) {
        actionIconViolations.push({
          file: path.relative(root, file),
          snippet: buttonBlock.replace(/\s+/g, ' ').trim(),
        });
        continue;
      }

      if (allowedActionIcons.size) {
        const iconMatch = buttonBlock.match(/<mat-icon\b[^>]*>([\s\S]*?)<\/mat-icon>/i);
        const iconName = iconMatch ? iconMatch[1].replace(/\s+/g, ' ').trim() : '';

        if (!allowedActionIcons.has(iconName)) {
          actionIconAllowlistViolations.push({
            file: path.relative(root, file),
            icon: iconName || '(leer)',
            snippet: buttonBlock.replace(/\s+/g, ' ').trim(),
          });
        }
      }
    }
  }

  const buttonTags = content.match(/<(button|a)\b[^>]*>/gi) || [];
  for (const tag of buttonTags) {
    const isMaterialButton = /\bmat-(flat-button|stroked-button|raised-button|button|icon-button)\b/i.test(tag);
    if (!isMaterialButton) {
      continue;
    }

    const classMatch = tag.match(/class\s*=\s*"([^"]*)"/i);
    if (!classMatch) {
      continue;
    }

    const classList = classMatch[1].split(/\s+/).filter(Boolean);
    const hasSpacingUtility = classList.some((cls) => /^(m|p)(t|b|s|e|x|y)-/.test(cls));
    if (!hasSpacingUtility) {
      continue;
    }

    materialButtonSpacingViolations.push({
      file: path.relative(root, file),
      tag: tag.replace(/\s+/g, ' ').trim(),
    });
  }
}

const unknownMat = [...foundMat].filter((tag) => !allowedMat.has(tag)).sort();
const unknownTrackedClasses = [...foundTrackedClasses].filter((cls) => !allowedClasses.has(cls)).sort();
const missingMatFromApp = [...allowedMat].filter((tag) => !foundMat.has(tag)).sort();
const missingTrackedClassesFromApp = [...allowedClasses].filter((cls) => !foundTrackedClasses.has(cls)).sort();

if (
  unknownMat.length ||
  unknownTrackedClasses.length ||
  actionColumnViolations.length ||
  materialButtonSpacingViolations.length ||
  actionColorViolations.length ||
  actionIconViolations.length ||
  actionIconAllowlistViolations.length
) {
  console.error('❌ UI-Katalog-Verstoß erkannt.');
  if (unknownMat.length) {
    console.error('\nNicht katalogisierte Material-Elemente in App-Templates:');
    for (const item of unknownMat) console.error(` - ${item}`);
  }
  if (unknownTrackedClasses.length) {
    console.error('\nNicht katalogisierte UI-/Layout-Klassen in App-Templates:');
    for (const item of unknownTrackedClasses) console.error(` - ${item}`);
  }
  if (actionColumnViolations.length) {
    console.error('\nActions-Spalten ohne standardisierte imr-action-cell Klasse:');
    for (const file of actionColumnViolations) console.error(` - ${file}`);
  }
  if (materialButtonSpacingViolations.length) {
    console.error('\nMaterial-Buttons mit verbotenen Spacing-Utility-Klassen (z. B. ms-2, px-0):');
    for (const violation of materialButtonSpacingViolations) {
      console.error(` - ${violation.file}: ${violation.tag}`);
    }
  }
  if (actionColorViolations.length) {
    console.error('\nActions-Buttons mit nicht erlaubter Farbe (erlaubt: primary, warn):');
    for (const violation of actionColorViolations) {
      console.error(` - ${violation.file}: ${violation.snippet}`);
    }
  }
  if (actionIconViolations.length) {
    console.error('\nActions-Buttons ohne mat-icon:');
    for (const violation of actionIconViolations) {
      console.error(` - ${violation.file}: ${violation.snippet}`);
    }
  }
  if (actionIconAllowlistViolations.length) {
    console.error('\nActions-Buttons mit nicht erlaubtem Icon (Allowlist aus imr-element-catalog.json > actionIcons):');
    for (const violation of actionIconAllowlistViolations) {
      console.error(` - ${violation.file}: icon="${violation.icon}" | ${violation.snippet}`);
    }
  }
  process.exit(1);
}

console.log('✅ UI-Katalog-Check erfolgreich.');
console.log(`Material-Elemente katalogisiert: ${allowedMat.size}`);
console.log(`Getrackte Layout-Klassen katalogisiert: ${allowedClasses.size}`);

if (missingMatFromApp.length) {
  console.log('\nHinweis: Diese katalogisierten Material-Elemente kommen aktuell nicht in Templates vor:');
  for (const item of missingMatFromApp) console.log(` - ${item}`);
}
if (missingTrackedClassesFromApp.length) {
  console.log('\nHinweis: Diese katalogisierten Layout-Klassen kommen aktuell nicht in Templates vor:');
  for (const item of missingTrackedClassesFromApp) console.log(` - ${item}`);
}
