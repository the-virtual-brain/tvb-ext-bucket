import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { requestAPI } from './handler';

/**
 * Initialization data for the tvb-ext-bucket extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'tvb-ext-bucket:plugin',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension tvb-ext-bucket is activated!');

    requestAPI<any>('get_example')
      .then(data => {
        console.log(data);
      })
      .catch(reason => {
        console.error(
          `The tvb-ext-bucket server extension appears to be missing.\n${reason}`
        );
      });
  }
};

export default plugin;
