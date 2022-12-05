import {
  ILabShell,
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import {
  ICommandPalette,
  MainAreaWidget,
  WidgetTracker
} from '@jupyterlab/apputils';

import { INotebookTracker } from '@jupyterlab/notebook';

import { IConsoleTracker } from '@jupyterlab/console';

import { BucketWidget } from './BucketWidget';

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
    INotebookTracker
  ],
  activate: (
    app: JupyterFrontEnd,
    palette: ICommandPalette,
    restorer: ILayoutRestorer,
    consoleTracker: IConsoleTracker,
    labShell: ILabShell,
    notebookTracker: INotebookTracker
  ) => {
    console.log('JupyterLab extension tvb-ext-bucket is activated!');

    let widget: MainAreaWidget<BucketWidget>;
    const command = 'tvbextbucket:open';
    app.commands.addCommand(command, {
      label: 'Bucket File Browser',
      execute: (): any => {
        if (!widget || widget.isDisposed) {
          const content = new BucketWidget();
          widget = new MainAreaWidget<BucketWidget>({ content });
          widget.id = 'tvbextbucket';
          widget.title.label = 'Bucket File Browser';
          widget.title.closable = true;
        }

        if (!tracker.has(widget)) {
          //Track the state of the widget for later restore
          tracker.add(widget);
        }

        if (!widget.isAttached) {
          app.shell.add(widget, 'main');
        }
        app.shell.activateById(widget.id);
      }
    });

    palette.addItem({ command, category: 'Bucket' });

    const tracker = new WidgetTracker<MainAreaWidget<BucketWidget>>({
      namespace: 'bucket'
    });

    restorer.restore(tracker, {
      command,
      name: () => 'bucket'
    });
  }
};

export default plugin;
