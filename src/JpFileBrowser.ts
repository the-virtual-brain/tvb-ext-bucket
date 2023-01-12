import { FileBrowser } from '@jupyterlab/filebrowser';

export const JpFileBrowser: IJpFileBrowser = {
  current: null
};

export interface IJpFileBrowser {
  current: FileBrowser | null;
}
