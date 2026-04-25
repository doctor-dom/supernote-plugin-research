/**
 * Config screen - API token entry and connection test
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {PluginManager} from 'sn-plugin-lib';
import {loadConfig, saveConfig} from '../utils/config';
import {setConfigLoader, testConnection, getProjects} from '../api/todoist';
import {saveProjectCache} from '../utils/config';

type Props = {
  onNavigate: (screen: string) => void;
};

export default function Config({onNavigate}: Props) {
  const [token, setToken] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadConfig().then(config => {
      if (config.apiToken) {
        setToken(config.apiToken);
      }
    });
  }, []);

  const handleTestConnection = async () => {
    if (!token.trim()) {
      setStatus('Please enter an API token');
      return;
    }

    setLoading(true);
    setStatus('Testing connection...');

    // Temporarily set the token for testing
    setConfigLoader(async () => ({apiToken: token.trim()}));

    try {
      const result = await testConnection();
      setStatus(`Connected. ${result.taskCount} active tasks, ${result.projectCount} projects.`);

      // Cache projects on successful connection
      const projects = await getProjects();
      await saveProjectCache(projects);
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    await saveConfig({
      apiToken: token.trim(),
      defaultProjectId: null,
      defaultPriority: 1,
    });
    setStatus('Settings saved.');
  };

  const handleClose = () => {
    PluginManager.closePluginView();
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>SuperTask Settings</Text>
        <Pressable style={styles.closeButton} onPress={handleClose}>
          <Text style={styles.closeText}>Close</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Todoist API Token</Text>
        <TextInput
          style={styles.input}
          value={token}
          onChangeText={setToken}
          placeholder="Paste your API token here"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={styles.hint}>
          Find your token at todoist.com/prefs/integrations
        </Text>
      </View>

      <View style={styles.buttonRow}>
        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleTestConnection}
          disabled={loading}>
          <Text style={styles.buttonText}>Test Connection</Text>
        </Pressable>

        <Pressable style={styles.button} onPress={handleSave}>
          <Text style={styles.buttonText}>Save Settings</Text>
        </Pressable>
      </View>

      {status ? (
        <View style={styles.statusBox}>
          <Text style={styles.statusText}>{status}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
  },
  closeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 4,
  },
  closeText: {
    fontSize: 16,
    color: '#000000',
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
    color: '#000000',
  },
  hint: {
    fontSize: 13,
    color: '#666666',
    marginTop: 6,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 4,
    alignItems: 'center',
  },
  buttonDisabled: {
    borderColor: '#999999',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  statusBox: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 4,
    backgroundColor: '#f5f5f5',
  },
  statusText: {
    fontSize: 14,
    color: '#000000',
  },
});
