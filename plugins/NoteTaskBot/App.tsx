/**
 * NoteTaskBot — Lasso OCR to Todoist subtasks
 * @format
 */

import React, {useState, useEffect} from 'react';
import {View, StyleSheet} from 'react-native';
import Capture from './src/screens/Capture';

function App(): React.JSX.Element {
  const [screen, setScreen] = useState('capture');

  useEffect(() => {
    global.__noteTaskBotNavigate = (name: string) => setScreen(name);
    return () => {
      global.__noteTaskBotNavigate = null;
    };
  }, []);

  return (
    <View style={styles.container}>
      {screen === 'capture' && <Capture />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default App;
