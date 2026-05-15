/**
 * Config screen - Compact e-ink layout
 *
 * Two tabs: Connections (API token, config source) and Preferences
 * (all settings use horizontal controls for space efficiency).
 *
 * Config persistence: reads/writes supertask-config.json via RNFS.
 * User can also seed this file via USB.
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Clipboard,
} from 'react-native';
import {PluginManager} from 'sn-plugin-lib';
import {loadConfig, saveConfig, getConfigSource, reloadConfig} from '../utils/config';
import {setConfigLoader, testConnection, getProjects} from '../api/todoist';
import {log} from '../utils/debug';

type Props = {
  onNavigate: (screen: string) => void;
  nav?: {push: (name: string, params?: Record<string, any>) => void; pop: () => void; replace: (name: string, params?: Record<string, any>) => void; resetTo: (name: string, params?: Record<string, any>) => void; canGoBack: boolean};
};

const TAB_OPTIONS = [
  {key: 'today', label: 'Today'},
  {key: 'upcoming', label: 'Upcoming'},
  {key: 'projects', label: 'Projects'},
];

export default function Config({onNavigate, nav}: Props) {
  const [activeTab, setActiveTab] = useState('connections');
  const [token, setToken] = useState('');
  const [tokenMasked, setTokenMasked] = useState(true);
  const [status, setStatus] = useState('');
  const [configSource, setConfigSource] = useState('defaults');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [projects, setProjects] = useState<any[]>([]);
  const [enabledProjectIds, setEnabledProjectIds] = useState<string[]>([]);
  const [defaultTab, setDefaultTab] = useState('today');
  const [defaultProjectId, setDefaultProjectId] = useState<string | null>(null);
  const [postCreateAction, setPostCreateAction] = useState('prompt');
  const [defaultScreen, setDefaultScreen] = useState('task-home');
  const [debugMode, setDebugMode] = useState(false);
  const [markAsTextFontSize, setMarkAsTextFontSize] = useState(32);
  const [markAsTextLink, setMarkAsTextLink] = useState(false);

  useEffect(() => {
    log('Config', 'MOUNT -- loading saved config');
    loadConfig().then(async config => {
      log('Config', `Config loaded: hasToken=${!!config.apiToken} defaultTab=${config.defaultTab}`);
      if (config.apiToken) {
        setToken(config.apiToken);
        setActiveTab('preferences');
      }
      if (config.enabledProjectIds) setEnabledProjectIds(config.enabledProjectIds);
      if (config.defaultTab) setDefaultTab(config.defaultTab);
      if (config.defaultProjectId) setDefaultProjectId(config.defaultProjectId);
      if (config.postCreateAction) setPostCreateAction(config.postCreateAction);
      if (config.defaultScreen) setDefaultScreen(config.defaultScreen);
      if (config.debugMode !== undefined) setDebugMode(config.debugMode);
      if (config.markAsTextFontSize) setMarkAsTextFontSize(config.markAsTextFontSize);
      if (config.markAsTextLink !== undefined) setMarkAsTextLink(config.markAsTextLink);

      setConfigSource(getConfigSource());

      if (config.apiToken) {
        try {
          setConfigLoader(() => Promise.resolve({apiToken: config.apiToken}));
          log('Config', 'Auto-fetching projects...');
          const fetched = await getProjects();
          setProjects(fetched || []);
          log('Config', `Auto-fetched ${fetched?.length ?? 0} projects`);
        } catch (err: any) {
          log('Config', `Auto-fetch projects failed: ${err.message}`);
        }
      }
    });
  }, []);

  const handlePaste = async () => {
    try {
      const text = await Clipboard.getString();
      if (text && text.trim()) {
        setToken(text.trim());
        log('Config', `Pasted token from clipboard (${text.trim().length} chars)`);
      } else {
        log('Config', 'Clipboard empty');
      }
    } catch (err: any) {
      log('Config', `Clipboard paste failed: ${err.message}`);
    }
  };

  const handleTestConnection = async () => {
    const t = token.trim();
    if (!t) {
      setStatus('Enter an API token first');
      return;
    }

    setStatus('Testing...');
    setConfigLoader(() => Promise.resolve({apiToken: t}));

    try {
      const result = await testConnection();
      setStatus(`Connected! ${result.taskCount} tasks, ${result.projectCount} projects`);
      log('Config', `Connected: ${result.taskCount} tasks, ${result.projectCount} projects`);

      const fetchedProjects = await getProjects();
      setProjects(fetchedProjects || []);
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
    }
  };

  const toggleProject = (projectId: string) => {
    setEnabledProjectIds(prev =>
      prev.includes(projectId) ? prev.filter(id => id !== projectId) : [...prev, projectId],
    );
  };

  const handleSave = async () => {
    log('Config', 'SAVE pressed');
    setSaving(true);
    const saved = await saveConfig({
      apiToken: token.trim(),
      enabledProjectIds,
      defaultTab,
      defaultProjectId,
      postCreateAction,
      defaultScreen,
      debugMode,
      markAsTextFontSize,
      markAsTextLink,
    });
    setSaving(false);
    setSaveStatus(saved ? 'Saved to device' : 'Saved (session only)');
    setConfigSource(getConfigSource());
    setTimeout(() => setSaveStatus(''), 2000);
  };

  const sourceLabel = (s: string) => {
    switch (s) {
      case 'file': return 'Device file';
      case 'bundled': return 'Build config';
      default: return 'Not saved';
    }
  };

  // ── Connections Tab ──────────────────────────────────────
  const renderConnectionsTab = () => (
    <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
      <Text style={s.sectionTitle}>Todoist API Token</Text>
      <View style={s.tokenRow}>
        <TextInput
          style={[s.input, {flex: 1}]}
          value={token}
          onChangeText={setToken}
          placeholder="Paste your API token"
          secureTextEntry={tokenMasked}
        />
        <Pressable style={s.btnSmall} onPress={handlePaste}>
          <Text style={s.btnSmallText}>Paste</Text>
        </Pressable>
        <Pressable style={s.btnSmall} onPress={() => setTokenMasked(!tokenMasked)}>
          <Text style={s.btnSmallText}>{tokenMasked ? 'Show' : 'Hide'}</Text>
        </Pressable>
      </View>
      <Text style={s.hint}>todoist.com/prefs/integrations &gt; API token</Text>

      <View style={s.inlineRow}>
        <Pressable style={s.btnAction} onPress={handleTestConnection}>
          <Text style={s.btnActionText}>Test Connection</Text>
        </Pressable>
        {status ? <Text style={s.statusInline}>{status}</Text> : null}
      </View>

      <View style={s.separator} />

      <Text style={s.sectionTitle}>Config Source</Text>
      <View style={s.inlineRow}>
        <View style={s.sourceChip}>
          <Text style={s.sourceChipText}>{sourceLabel(configSource)}</Text>
        </View>
        <Text style={s.hint}>
          {configSource === 'file'
            ? 'MyStyle/SuperTask/supertask-config.json'
            : configSource === 'bundled'
            ? 'Using build-time config.local.js'
            : 'No persistent config found'}
        </Text>
      </View>
    </ScrollView>
  );

  // ── Preferences Tab ──────────────────────────────────────
  const renderPreferencesTab = () => (
    <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
      {/* ── General ── */}
      <Text style={s.groupTitle}>General</Text>

      <Text style={s.sectionTitle}>Default tab</Text>
      <View style={s.toggleRow}>
        {TAB_OPTIONS.map(opt => (
          <Pressable
            key={opt.key}
            style={[s.toggleBtn, defaultTab === opt.key && s.toggleBtnActive]}
            onPress={() => setDefaultTab(opt.key)}>
            <Text style={[s.toggleText, defaultTab === opt.key && s.toggleTextActive]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={s.sectionTitle}>After creating a task</Text>
      <View style={s.inlineRow}>
        <Pressable style={s.radioRow} onPress={() => setPostCreateAction('prompt')}>
          <Text style={s.radio}>{postCreateAction === 'prompt' ? '(*)' : '( )'}</Text>
          <Text style={s.radioLabel}>Ask (Add/Done)</Text>
        </Pressable>
        <Pressable style={s.radioRow} onPress={() => setPostCreateAction('auto-back')}>
          <Text style={s.radio}>{postCreateAction === 'auto-back' ? '(*)' : '( )'}</Text>
          <Text style={s.radioLabel}>Go back</Text>
        </Pressable>
      </View>

      <Text style={s.sectionTitle}>Open plugin to</Text>
      <View style={s.inlineRow}>
        <Pressable style={s.radioRow} onPress={() => setDefaultScreen('task-home')}>
          <Text style={s.radio}>{defaultScreen === 'task-home' ? '(*)' : '( )'}</Text>
          <Text style={s.radioLabel}>Task Home</Text>
        </Pressable>
        <Pressable style={s.radioRow} onPress={() => setDefaultScreen('last-used')}>
          <Text style={s.radio}>{defaultScreen === 'last-used' ? '(*)' : '( )'}</Text>
          <Text style={s.radioLabel}>Last Used</Text>
        </Pressable>
      </View>

      {/* ── Projects ── */}
      {projects.length > 0 && (
        <>
          <View style={s.separator} />
          <Text style={s.groupTitle}>Projects</Text>

          <Text style={s.sectionTitle}>
            Show projects  <Text style={s.hint}>Select which to show</Text>
          </Text>
          <View style={s.checkGrid}>
            {projects.map(p => {
              const enabled = enabledProjectIds.includes(p.id);
              return (
                <Pressable key={p.id} style={s.checkItem} onPress={() => toggleProject(p.id)}>
                  <Text style={s.checkbox}>{enabled ? '[X]' : '[  ]'}</Text>
                  <Text style={s.checkLabel} numberOfLines={1}>{p.name}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={s.sectionTitle}>Default project for new tasks</Text>
          <View style={s.buttonGrid}>
            <Pressable
              style={[s.gridBtn, !defaultProjectId && s.gridBtnActive]}
              onPress={() => setDefaultProjectId(null)}>
              <Text style={[s.gridBtnText, !defaultProjectId && s.gridBtnTextActive]}>None</Text>
            </Pressable>
            {projects.map(p => (
              <Pressable
                key={p.id}
                style={[s.gridBtn, defaultProjectId === p.id && s.gridBtnActive]}
                onPress={() => setDefaultProjectId(p.id)}>
                <Text style={[s.gridBtnText, defaultProjectId === p.id && s.gridBtnTextActive]}>
                  {p.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {/* ── Handwriting ── */}
      <View style={s.separator} />
      <Text style={s.groupTitle}>Handwriting</Text>

      <Text style={s.sectionTitle}>Mark as text font size</Text>
      <View style={s.inlineRow}>
        <Text style={s.sizeLabel}>Size:</Text>
        {[24, 28, 32, 36, 40].map(size => (
          <Pressable
            key={size}
            style={[s.sizeBtn, markAsTextFontSize === size && s.sizeBtnActive]}
            onPress={() => setMarkAsTextFontSize(size)}>
            <Text style={[s.sizeBtnText, markAsTextFontSize === size && s.sizeBtnTextActive]}>
              {size}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={s.sectionTitle}>Link to Todoist task</Text>
      <Text style={s.hint}>Adds dashed border + tappable link to task.</Text>
      <Pressable style={s.radioRow} onPress={() => setMarkAsTextLink(!markAsTextLink)}>
        <Text style={s.checkbox}>{markAsTextLink ? '[X]' : '[  ]'}</Text>
        <Text style={s.radioLabel}>Add Todoist link to replaced text</Text>
      </Pressable>

      {/* ── Advanced ── */}
      <View style={s.separator} />
      <Text style={s.groupTitle}>Advanced</Text>

      <Pressable style={s.radioRow} onPress={() => setDebugMode(!debugMode)}>
        <Text style={s.checkbox}>{debugMode ? '[X]' : '[  ]'}</Text>
        <Text style={s.radioLabel}>Debug mode</Text>
        <Text style={s.hint}>  Show Log buttons</Text>
      </Pressable>

      {debugMode && nav && (
        <Pressable style={[s.btnAction, {marginTop: 8}]} onPress={() => nav.push('diagnostics')}>
          <Text style={s.btnActionText}>API Diagnostics</Text>
        </Pressable>
      )}
    </ScrollView>
  );

  // ── Main Layout ──────────────────────────────────────────
  return (
    <View style={s.wrapper}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Settings</Text>
        <View style={s.headerBtns}>
          <Pressable style={s.headerBtn} onPress={handleSave} disabled={saving}>
            <Text style={s.headerBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
          </Pressable>
          <Pressable style={s.headerBtn} onPress={() => PluginManager.closePluginView()}>
            <Text style={s.headerBtnText}>Close</Text>
          </Pressable>
        </View>
      </View>

      {/* Tab bar */}
      <View style={s.tabBar}>
        <Pressable
          style={[s.tab, activeTab === 'connections' && s.tabActive]}
          onPress={() => setActiveTab('connections')}>
          <Text style={[s.tabText, activeTab === 'connections' && s.tabTextActive]}>Connections</Text>
        </Pressable>
        <Pressable
          style={[s.tab, activeTab === 'preferences' && s.tabActive]}
          onPress={() => setActiveTab('preferences')}>
          <Text style={[s.tabText, activeTab === 'preferences' && s.tabTextActive]}>Preferences</Text>
        </Pressable>
      </View>

      {/* Body */}
      <View style={s.body}>
        {activeTab === 'connections' ? renderConnectionsTab() : renderPreferencesTab()}
      </View>

      {/* Save toast */}
      {saveStatus ? (
        <View style={s.toast}>
          <Text style={s.toastText}>{saveStatus}</Text>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: {flex: 1, backgroundColor: '#ffffff'},

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  title: {fontSize: 24, fontWeight: '700', color: '#000000'},
  headerBtns: {flexDirection: 'row', gap: 8},
  headerBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 4,
  },
  headerBtnText: {fontSize: 16, fontWeight: '600', color: '#000000'},

  // Tabs
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {borderBottomColor: '#000000'},
  tabText: {fontSize: 16, color: '#888888', fontWeight: '500'},
  tabTextActive: {color: '#000000', fontWeight: '700'},

  // Body
  body: {flex: 1},
  scroll: {flex: 1},
  scrollContent: {padding: 20, paddingBottom: 40},

  // Sections
  groupTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
    marginTop: 10,
    marginBottom: 6,
  },
  hint: {fontSize: 12, color: '#666666', fontWeight: '400'},
  separator: {height: 1, backgroundColor: '#cccccc', marginVertical: 14},

  // Inputs
  input: {
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#000000',
  },
  tokenRow: {flexDirection: 'row', gap: 6, marginBottom: 4},

  // Buttons
  btnSmall: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 4,
    justifyContent: 'center',
  },
  btnSmallText: {fontSize: 13, fontWeight: '600', color: '#000000'},
  btnAction: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 4,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  btnActionText: {fontSize: 15, fontWeight: '700', color: '#000000'},

  // Inline row
  inlineRow: {flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap'},

  // Status
  statusInline: {fontSize: 14, color: '#000000'},

  // Config source chip
  sourceChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  sourceChipText: {fontSize: 13, fontWeight: '600', color: '#000000'},

  // Toggle row (horizontal buttons like Default tab)
  toggleRow: {flexDirection: 'row', gap: 6},
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#000000',
    alignItems: 'center',
  },
  toggleBtnActive: {backgroundColor: '#000000'},
  toggleText: {fontSize: 14, fontWeight: '600', color: '#000000'},
  toggleTextActive: {color: '#ffffff'},

  // Radio
  radioRow: {flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6},
  radio: {fontSize: 15, fontWeight: '700', color: '#000000', fontFamily: 'monospace'},
  radioLabel: {fontSize: 15, color: '#000000'},

  // Checkbox
  checkbox: {fontSize: 15, fontWeight: '700', color: '#000000', fontFamily: 'monospace'},
  checkLabel: {fontSize: 14, color: '#000000', flex: 1},

  // 2-column checkbox grid
  checkGrid: {flexDirection: 'row', flexWrap: 'wrap'},
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '50%',
    paddingVertical: 6,
  },

  // Button grid (default project, wrapping)
  buttonGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 6},
  gridBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 4,
  },
  gridBtnActive: {backgroundColor: '#000000'},
  gridBtnText: {fontSize: 13, fontWeight: '600', color: '#000000'},
  gridBtnTextActive: {color: '#ffffff'},

  // Size picker
  sizeLabel: {fontSize: 14, fontWeight: '600', color: '#000000', marginRight: 4},
  sizeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#000000',
  },
  sizeBtnActive: {backgroundColor: '#000000'},
  sizeBtnText: {fontSize: 14, color: '#000000'},
  sizeBtnTextActive: {color: '#ffffff'},

  // Toast
  toast: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    padding: 12,
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 4,
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  toastText: {fontSize: 15, fontWeight: '700', color: '#000000'},
});
