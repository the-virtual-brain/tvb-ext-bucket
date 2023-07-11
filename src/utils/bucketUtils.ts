/**
 * Helper function to extract extension name from a file name
 * @param name
 */
import { requestAPI } from '../handler';

export const getExtension = (name: string): string => {
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

/**
 * Call end-point to predict bucket based on user e-brains context
 */
export async function guessBucket(): Promise<string> {
  const response = await requestAPI<IGuessResponse>('guess_bucket');
  if (!response.success) {
    throw new Error(response.message);
  }
  return response.bucket;
}

export interface IGuessResponse {
  success: boolean;
  bucket: string;
  message: string;
}
