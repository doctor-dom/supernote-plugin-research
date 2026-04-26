/**
 * Config screen - API token, project selection, default tab
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

type Props = {
  onNavigate: (screen: string) => void;
};

const TAB_OPTIONS = [
  {key: 'today', label: 'Today'},
  {key: 'upcoming', label: 'Upcoming'},
  {key: 'projects', label: 'Projects'},
];

export default function Config({onNavigate}: Props) {
  const [token, setToken] = useState('');
  const [status, setStatus] = useState('');
  const [projects, setProjects] = useState<any[]>([]);
  const [enabledProjectIds, setEnabledProjectIds] = useState<string[]>([]);
  const [defaultTab, setDefaultTab] = useState('today');
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    loadConfig().then(config => {
      if (config.apiToken) setToken(config.apiToken);
      if (config.enabledProjectIds) setEnabledProjectIds(config.enabledProjectIds);
      if (config.defaultTab) setDefaultTab(config.defaultTab);
    });
  }, []);

  const handleTestConnection = async () => {
    if (!token.trim()) {
      setStatus('Enter an API token first');
      return;
    }

    setStatus('Testing...');
    setConfigLoader(() => Promise.resolve({apiToken: token.trim()}));

    try {
      const result = await testConnection();
      setStatus(`Connected! ${result.taskCount} tasks, ${result.projectCount} projects`);
      setConnected(true);

      // Fetch projects for the toggle list
      const fetchedProjects = await getProjects();
      setProjects(fetchedProjects || []);
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
      setConnected(false);
    }
  };

  const toggleProject = (projectId: string) => {
    setEnabledProjectIds(prev => {
      if (prev.includes(projectId)) {
        return prev.filter(id => id !== projectId);
      }
      return [...prev, projectId];
    });
  };

  const handleSave = async () => {
    await saveConfig({
      apiToken: token.trim(),
      enabledProjectIds,
      defaultTab,
    });
    setStatus('Settings saved (in memory)');
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Pressable style={styles.closeButton} onPress={() => PluginManager.closePluginView()}>
          <Text style={styles.closeText}>Close</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Todoist API Token</Text>
        <TextInput
          style={styles.input}
          value={token}
          onChangeText={setToken}
          placeholder="Paste your API token"
          secureTextEntry
        />
      </View>

      <Pressable style={styles.actionButton} onPress={handleTestConnection}>
        <Text style={styles.actionText}>Test Connection</Text>
      </Pressable>

      {connected && projects.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label}>Show Projects</Text>
          <Text style={styles.hint}>
            Select which projects to show. None selected = show all.
          </Text>
          {projects.map(p => {
            const enabled = enabledProjectIds.includes(p.id);
            return (
              <Pressable
                key={p.id}
                style={styles.projectRow}
                onPress={() => toggleProject(p.id)}>
                <Text style={styles.projectCheck}>{enabled ? '[X]' : '[  ]'}</Text>
                <Text style={styles.projectName}>{p.name}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {connected && (
        <View style={styles.section}>
          <Text style={styles.label}>Default Tab</Text>
          <View style={styles.tabOptions}>
            {TAB_OPTIONS.map(opt => (
              <Pressable
                key={opt.key}
                style={[styles.tabOption, defaultTab === opt.key && styles.tabOptionSelected]}
                onPress={() => setDefaultTab(opt.key)}>
                <Text style={[
                  styles.tabOptionText,
                  defaultTab === opt.key && styles.tabOptionTextSelected,
                ]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <Pressable style={styles.actionButton} onPress={handleSave}>
        <Text style={styles.actionText}>Save Settings</Text>
      </Pressable>

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
    marginBottom: 24,
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
  hint: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
    color: '#000000',
  },
  actionButton: {
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 4,
    alignItems: 'center',
    marginBottom: 20,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 12,
  },
  projectCheck: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    fontFamily: 'monospace',
  },
  projectName: {
    fontSize: 16,
    color: '#000000',
  },
  tabOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  tabOption: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 4,
    alignItems: 'center',
  },
  tabOptionSelected: {
    backgroundColor: '#000000',
  },
  tabOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  tabOptionTextSelected: {
    color: '#ffffff',
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
