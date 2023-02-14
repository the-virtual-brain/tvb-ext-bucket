/**
 * Helper function to extract extension name from a file name
 * @param name
 */
export const getExtension = (name: string) => {
  let extensionSuffix = '';

  for (let i = name.length - 1; i > -1; i--) {
    extensionSuffix = name[i] + extensionSuffix;
    if (name[i] === '.') {
      break;
    }
  }

  if (extensionSuffix.startsWith('.')) {
    return extensionSuffix;
  }

  return '';
};
