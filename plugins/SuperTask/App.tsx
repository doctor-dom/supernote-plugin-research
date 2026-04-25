/**
 * SuperTask - Root component
 *
 * Routes to the correct screen based on which button was tapped.
 *
 * @format
 */

import React, {useState, useEffect} from 'react';
import {View, StyleSheet} from 'react-native';

import TaskList from './src/screens/TaskList';
import Capture from './src/screens/Capture';
import Config from './src/screens/Config';

type Screen = 'tasks' | 'capture-lasso' | 'capture-doc' | 'config';

function App(): React.JSX.Element {
  const [screen, setScreen] = useState<Screen>('tasks');

  useEffect(() => {
    const buttonId = global.__superTaskButtonId;
    if (buttonId === 200) {
      setScreen('capture-lasso');
    } else if (buttonId === 300) {
      setScreen('capture-doc');
    } else if (buttonId === 'config') {
      setScreen('config');
    } else {
      setScreen('tasks');
    }
  }, []);

  return (
    <View style={styles.container}>
      {screen === 'tasks' && <TaskList onNavigate={setScreen} />}
      {screen === 'capture-lasso' && <Capture mode="lasso" onNavigate={setScreen} />}
      {screen === 'capture-doc' && <Capture mode="doc" onNavigate={setScreen} />}
      {screen === 'config' && <Config onNavigate={setScreen} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});

export default App;
