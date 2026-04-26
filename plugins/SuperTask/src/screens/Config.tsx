/**
 * Config screen - API token, project selection, default tab, behavior settings
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
import {log} from '../utils/debug';

type Props = {
  onNavigate: (screen: string) => void;
};

const TAB_OPTIONS = [
  {key: 'today', label: 'Today'},
  {key: 'upcoming', label: 'Upcoming'},
  {key: 'projects', label: 'Projects'},
];

const POST_CREATE_OPTIONS = [
  {key: 'prompt', label: 'Ask (Add Another / Done)'},
  {key: 'auto-back', label: 'Go back automatically'},
];

const DEFAULT_SCREEN_OPTIONS = [
  {key: 'task-home', label: 'Task Home'},
  {key: 'last-used', label: 'Last Used Screen'},
];

export default function Config({onNavigate}: Props) {
  const [token, setToken] = useState('');
  const [tokenMasked, setTokenMasked] = useState(true);
  const [status, setStatus] = useState('');
  const [projects, setProjects] = useState<any[]>([]);
  const [enabledProjectIds, setEnabledProjectIds] = useState<string[]>([]);
  const [defaultTab, setDefaultTab] = useState('today');
  const [defaultProjectId, setDefaultProjectId] = useState<string | null>(null);
  const [postCreateAction, setPostCreateAction] = useState('prompt');
  const [defaultScreen, setDefaultScreen] = useState('task-home');
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    log('Config', 'MOUNT');
    loadConfig().then(config => {
      if (config.apiToken) {
        setToken(config.apiToken);
        // Auto-connect if we have a token from bundled config
        handleConnect(config.apiToken);
      }
      if (config.enabledProjectIds) setEnabledProjectIds(config.enabledProjectIds);
      if (config.defaultTab) setDefaultTab(config.defaultTab);
      if (config.defaultProjectId) setDefaultProjectId(config.defaultProjectId);
      if (config.postCreateAction) setPostCreateAction(config.postCreateAction);
      if (config.defaultScreen) setDefaultScreen(config.defaultScreen);
    });
  }, []);

  const handleConnect = async (tokenOverride?: string) => {
    const t = (tokenOverride || token).trim();
    if (!t) {
      setStatus('Enter an API token first');
      return;
    }

    setStatus('Testing...');
    setConfigLoader(() => Promise.resolve({apiToken: t}));

    try {
      const result = await testConnection();
      setStatus(`Connected! ${result.taskCount} tasks, ${result.projectCount} projects`);
      setConnected(true);
      log('Config', `Connected: ${result.taskCount} tasks, ${result.projectCount} projects`);

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
    log('Config', 'SAVE pressed');
    await saveConfig({
      apiToken: token.trim(),
      enabledProjectIds,
      defaultTab,
      defaultProjectId,
      postCreateAction,
      defaultScreen,
    });
    setStatus('Settings saved (in memory)');
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Pressable style={styles.closeButton} onPress={() => PluginManager.closePluginView()}>
          <Text style={styles.closeText}>Close</Text>
        </Pressable>
      </View>

      {/* API Token */}
      <View style={styles.section}>
        <Text style={styles.label}>Todoist API Token</Text>
        <View style={styles.tokenRow}>
          <TextInput
            style={[styles.input, styles.tokenInput]}
            value={token}
            onChangeText={setToken}
            placeholder="Paste your API token"
            secureTextEntry={tokenMasked}
          />
          <Pressable style={styles.tokenToggle} onPress={() => setTokenMasked(!tokenMasked)}>
            <Text style={styles.tokenToggleText}>{tokenMasked ? 'Show' : 'Hide'}</Text>
          </Pressable>
        </View>
        <Text style={styles.hint}>
          Find your token at todoist.com/prefs/integrations
        </Text>
      </View>

      <Pressable style={styles.actionButton} onPress={() => handleConnect()}>
        <Text style={styles.actionText}>Test Connection</Text>
      </Pressable>

      {/* Project filters */}
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

      {/* Default project for new tasks */}
      {connected && projects.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label}>Default Project for New Tasks</Text>
          <Text style={styles.hint}>
            Pre-selected when creating a task. Tap to toggle.
          </Text>
          <View style={styles.optionGrid}>
            <Pressable
              style={[styles.optionButton, !defaultProjectId && styles.optionButtonSelected]}
              onPress={() => setDefaultProjectId(null)}>
              <Text style={[styles.optionText, !defaultProjectId && styles.optionTextSelected]}>
                None
              </Text>
            </Pressable>
            {projects.map(p => (
              <Pressable
                key={p.id}
                style={[styles.optionButton, defaultProjectId === p.id && styles.optionButtonSelected]}
                onPress={() => setDefaultProjectId(p.id)}>
                <Text style={[styles.optionText, defaultProjectId === p.id && styles.optionTextSelected]}>
                  {p.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Default tab */}
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

      {/* Post-create behavior */}
      {connected && (
        <View style={styles.section}>
          <Text style={styles.label}>After Creating a Task</Text>
          {POST_CREATE_OPTIONS.map(opt => (
            <Pressable
              key={opt.key}
              style={styles.radioRow}
              onPress={() => setPostCreateAction(opt.key)}>
              <Text style={styles.radioCheck}>
                {postCreateAction === opt.key ? '(O)' : '(  )'}
              </Text>
              <Text style={styles.radioLabel}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Default screen on open */}
      {connected && (
        <View style={styles.section}>
          <Text style={styles.label}>Open Plugin To</Text>
          {DEFAULT_SCREEN_OPTIONS.map(opt => (
            <Pressable
              key={opt.key}
              style={styles.radioRow}
              onPress={() => setDefaultScreen(opt.key)}>
              <Text style={styles.radioCheck}>
                {defaultScreen === opt.key ? '(O)' : '(  )'}
              </Text>
              <Text style={styles.radioLabel}>{opt.label}</Text>
            </Pressable>
          ))}
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
    paddingBottom: 48,
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
  tokenRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  tokenInput: {
    flex: 1,
  },
  tokenToggle: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 4,
    justifyContent: 'center',
  },
  tokenToggleText: {
    fontSize: 14,
    fontWeight: '600',
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
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 4,
  },
  optionButtonSelected: {
    backgroundColor: '#000000',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  optionTextSelected: {
    color: '#ffffff',
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
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 12,
  },
  radioCheck: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    fontFamily: 'monospace',
  },
  radioLabel: {
    fontSize: 16,
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
