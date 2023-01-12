import {
  ILabShell,
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { FileBrowser, IFileBrowserFactory } from '@jupyterlab/filebrowser';

import { ICommandPalette, WidgetTracker } from '@jupyterlab/apputils';

import { IConsoleTracker } from '@jupyterlab/console';

import { BucketWidget } from './BucketWidget';

import { JpFileBrowser } from './JpFileBrowser';

/**
 * Initialization data for the tvb-ext-bucket extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'tvb-ext-bucket:plugin',
  autoStart: true,
  requires: [
    ICommandPalette,
    ILayoutRestorer,
    IConsoleTracker,
    ILabShell,
    IFileBrowserFactory
  ],
  activate: (
    app: JupyterFrontEnd,
    palette: ICommandPalette,
    restorer: ILayoutRestorer,
    consoleTracker: IConsoleTracker,
    labShell: ILabShell,
    fileBrowserFactory: IFileBrowserFactory
  ) => {
    console.log('JupyterLab extension tvb-ext-bucket is activated!');

    // set up the default file browser
    const browser: FileBrowser = fileBrowserFactory.defaultBrowser;
    JpFileBrowser.current = browser;

    const id = 'tvb-ext-bucket';
    const sidebar = new BucketWidget();
    sidebar.id = id;
    sidebar.title.iconClass = 'bucket-CollabLogo jp-SideBar-tabIcon';
    sidebar.title.caption = 'Bucket';
    const command = 'tvbextbucket:open';

    labShell.add(sidebar, 'right', { rank: 200 });

    const tracker = new WidgetTracker<BucketWidget>({
      namespace: 'bucket'
    });

    restorer.add(sidebar, id);
    restorer.restore(tracker, {
      command,
      name: () => 'bucket'
    });
  }
};

export default plugin;
