/**
 * SuperTask - Lasso-to-Todoist plugin for Supernote
 *
 * Entry points:
 *   Button 100 (toolbar, NOTE): "Tasks" - open task viewer
 *   Button 200 (lasso, NOTE):   "Add Task" - capture lassoed handwriting
 *   Button 300 (toolbar, DOC):  "Add Task" - capture selected PDF text
 *   Config button:              Settings - API token, default project
 *
 * @format
 */

import {AppRegistry, Image} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import {PluginManager} from 'sn-plugin-lib';

AppRegistry.registerComponent(appName, () => App);

PluginManager.init();

const icon = Image.resolveAssetSource(require('./assets/icon.png')).uri;

// Toolbar in NOTE - opens task viewer
PluginManager.registerButton(1, ['NOTE'], {
  id: 100,
  name: 'Tasks',
  icon,
  showType: 1,
});

// Lasso toolbar in NOTE - capture handwritten task
PluginManager.registerButton(2, ['NOTE'], {
  id: 200,
  name: 'Add Task',
  icon,
  editDataTypes: [0, 1, 3], // strokes, titles, text
  showType: 1,
});

// Toolbar in DOC - capture selected text as task
PluginManager.registerButton(1, ['DOC'], {
  id: 300,
  name: 'Add Task',
  icon,
  showType: 1,
});

// Config button - settings/API token
PluginManager.registerConfigButton();

// Route button presses so App knows which screen to show
global.__superTaskButtonId = null;

PluginManager.registerButtonListener({
  onButtonPress: (msg) => {
    global.__superTaskButtonId = msg.id;
  },
});

PluginManager.registerConfigButtonListener({
  onConfigButtonPress: () => {
    global.__superTaskButtonId = 'config';
  },
});
