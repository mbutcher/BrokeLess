import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

type ComponentsSection = Record<string, Record<string, unknown>>;
type YamlDoc = Record<string, unknown>;

/**
 * Loads the base openapi.yaml and deep-merges all path YAML files from docs/openapi/paths/.
 * Each path YAML may contain both `paths:` and `components:` sections.
 * The merged spec is returned as a plain object for swagger-ui-express.
 */
export function buildSwaggerSpec(): YamlDoc {
  const docsDir = path.resolve(__dirname, '../../../docs/openapi');
  const base = yaml.load(
    fs.readFileSync(path.join(docsDir, 'openapi.yaml'), 'utf8')
  ) as YamlDoc;

  if (!base['paths']) base['paths'] = {};
  if (!base['components']) base['components'] = {};
  const baseComponents = base['components'] as ComponentsSection;

  const pathsDir = path.join(docsDir, 'paths');
  const files = fs.readdirSync(pathsDir).filter((f) => f.endsWith('.yaml')).sort();

  for (const file of files) {
    const partial = yaml.load(
      fs.readFileSync(path.join(pathsDir, file), 'utf8')
    ) as YamlDoc | null;
    if (!partial) continue;

    // Merge paths
    if (partial['paths'] && typeof partial['paths'] === 'object') {
      Object.assign(base['paths'] as YamlDoc, partial['paths']);
    }

    // Deep-merge components (schemas, responses, parameters, etc.)
    if (partial['components'] && typeof partial['components'] === 'object') {
      const partialComponents = partial['components'] as ComponentsSection;
      for (const [section, items] of Object.entries(partialComponents)) {
        if (!baseComponents[section]) baseComponents[section] = {};
        Object.assign(baseComponents[section], items);
      }
    }
  }

  return base;
}
