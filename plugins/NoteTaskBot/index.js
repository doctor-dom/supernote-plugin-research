/**
 * NoteTaskBot — Lasso handwriting to Todoist subtasks
 *
 * Button 200 (lasso, NOTE): Capture tasks from lassoed handwriting
 * Config button: not used (token via MyStyle JSON)
 *
 * @format
 */

import {AppRegistry, Image} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import {PluginManager} from 'sn-plugin-lib';

AppRegistry.registerComponent(appName, () => App);

PluginManager.init();

const icon = Image.resolveAssetSource(require('./assets/checkbox-done.png')).uri;

PluginManager.registerButton(2, ['NOTE'], {
  id: 200,
  name: 'Capture Tasks',
  icon,
  editDataTypes: [0, 1, 3],
  showType: 1,
});

global.__noteTaskBotButtonId = null;

PluginManager.registerButtonListener({
  onButtonPress: (msg) => {
    global.__noteTaskBotButtonId = msg.id;
  },
});
