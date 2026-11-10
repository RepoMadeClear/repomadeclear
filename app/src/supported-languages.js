import path from 'node:path';

export const LANGUAGE_EXTENSIONS = Object.freeze({
  JavaScript: ['.js', '.jsx', '.mjs', '.cjs'],
  TypeScript: ['.ts', '.tsx'],
  Python: ['.py'],
  Java: ['.java'],
  'C#': ['.cs'],
  'C++': ['.cpp', '.cc', '.cxx', '.hpp', '.hh', '.hxx'],
  C: ['.c', '.h'],
  SQL: ['.sql'],
  Go: ['.go'],
  Rust: ['.rs'],
  PHP: ['.php'],
  Kotlin: ['.kt', '.kts'],
  Swift: ['.swift'],
  Ruby: ['.rb'],
  R: ['.r'],
});
export const SUPPORTED_EXTENSIONS = Object.freeze([...new Set(Object.values(LANGUAGE_EXTENSIONS).flat())]);
export const languageFor = file => {
  const extension = path.posix.extname(file).toLowerCase();
  return Object.entries(LANGUAGE_EXTENSIONS).find(([, extensions]) => extensions.includes(extension))?.[0] || null;
};
export const isSupportedSource = file => languageFor(file) !== null;
export const ANALYZED_LANGUAGES = Object.freeze(['JavaScript', 'TypeScript', 'Python', 'Java']);
