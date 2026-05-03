/**
 * TaskHome - Tabbed task viewer (Today / Upcoming / Projects)
 *
 * Replaces the old flat TaskList screen with grouped, navigable views.
 */

import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
} from 'react-native';
import {PluginManager, PluginCommAPI} from 'sn-plugin-lib';
import {loadConfig} from '../utils/config';
import {setConfigLoader, getTasks, getProjects, completeTask} from '../api/todoist';
import {log, logError} from '../utils/debug';
import TabBar from '../components/TabBar';
import TaskRow from '../components/TaskRow';
import SectionHeader from '../components/SectionHeader';

type Nav = {
  push: (name: string, params?: Record<string, any>) => void;
  pop: () => void;
  resetTo: (name: string) => void;
  canGoBack: boolean;
};

type Props = {
  nav: Nav;
};

const TABS = [
  {key: 'today', label: 'Today'},
  {key: 'upcoming', label: 'Upcoming'},
  {key: 'projects', label: 'Projects'},
];

type ProjectMap = Record<string, string>;

export default function TaskHome({nav}: Props) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [projectMap, setProjectMap] = useState<ProjectMap>({});
  const [projectList, setProjectList] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('today');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pageRef, setPageRef] = useState('');

  // Load default tab from config and detect current page on mount
  useEffect(() => {
    loadConfig().then(config => {
      if (config.defaultTab) {
        log('TaskHome', `Setting default tab from config: ${config.defaultTab}`);
        setActiveTab(config.defaultTab);
      }
    });

    // Detect current note/page for "This Page" section
    (async () => {
      try {
        const fp = await PluginCommAPI.getCurrentFilePath();
        const pn = await PluginCommAPI.getCurrentPageNum();
        const filePath = fp?.result || '';
        const pageNum = pn?.result ?? 0;
        if (filePath) {
          const fileName = filePath.split('/').pop()?.replace('.note', '') || '';
          const ref = `From: ${fileName} p.${pageNum}`;
          setPageRef(ref);
          log('TaskHome', `Page context: ${ref}`);
        }
      } catch (e: any) {
        log('TaskHome', `Page context detection failed: ${e.message}`);
      }
    })();
  }, []);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    setConfigLoader(loadConfig);

    try {
      const config = await loadConfig();
      if (!config.apiToken) {
        setError('No API token. Use the config button to set it up.');
        if (!silent) setLoading(false);
        return;
      }

      log('TaskHome', `Fetching tasks and projects...${silent ? ' (silent refresh)' : ''}`);
      const [fetchedTasks, fetchedProjects] = await Promise.all([
        getTasks(),
        getProjects(),
      ]);

      const pMap: ProjectMap = {};
      (fetchedProjects || []).forEach((p: any) => { pMap[p.id] = p.name; });
      setProjectMap(pMap);
      setProjectList(fetchedProjects || []);
      setTasks(fetchedTasks || []);
      log('TaskHome', `Loaded ${fetchedTasks?.length ?? 0} tasks, ${fetchedProjects?.length ?? 0} projects`);
    } catch (err: any) {
      logError('TaskHome', err);
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    log('TaskHome', 'MOUNT');
    fetchData();
  }, [fetchData]);

  const handleComplete = async (taskId: string) => {
    log('TaskHome', `COMPLETE pressed taskId=${taskId}`);
    try {
      await completeTask(taskId);
      log('TaskHome', `COMPLETE success taskId=${taskId}`);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err: any) {
      logError('TaskHome', err);
      setError(`Complete failed: ${err.message}`);
    }
  };

  const handleTaskPress = (task: any) => {
    log('TaskHome', `TASK pressed id=${task.id} content="${task.content?.slice(0, 30)}"`);
    nav.push('task-detail', {task, projects: projectList});
  };

  const handleAddTask = async () => {
    log('TaskHome', 'ADD TASK pressed');
    const config = await loadConfig();
    nav.push('task-add', {projects: projectList, defaultProjectId: config.defaultProjectId});
  };

  const today = new Date().toISOString().slice(0, 10);

  // Tasks linked to the current note page
  const pageTasks = pageRef
    ? tasks.filter(t => t.description && t.description.includes(pageRef))
    : [];

  const renderThisPage = () => {
    if (pageTasks.length === 0 || loading) return null;

    return (
      <View style={styles.thisPage}>
        <View style={styles.thisPageHeader}>
          <Text style={styles.thisPageTitle}>This Page</Text>
          <Text style={styles.thisPageCount}>{pageTasks.length}</Text>
        </View>
        {pageTasks.map((task, i) => (
          <View key={task.id}>
            {i > 0 && <View style={styles.thisPageSeparator} />}
            <TaskRow
              task={task}
              onComplete={handleComplete}
              onPress={handleTaskPress}
              showProject={projectMap[task.project_id]}
            />
          </View>
        ))}
      </View>
    );
  };

  // Build sections based on active tab
  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Loading tasks...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      );
    }

    if (activeTab === 'today') return renderTodayTab();
    if (activeTab === 'upcoming') return renderUpcomingTab();
    return renderProjectsTab();
  };

  const renderTodayTab = () => {
    // Tasks due today or overdue, grouped by project
    const todayTasks = tasks.filter(t => {
      const due = t.due?.date;
      return due && due <= today;
    });

    if (todayTasks.length === 0) {
      return (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No tasks due today</Text>
        </View>
      );
    }

    // Group by project
    const groups = groupByProject(todayTasks, projectMap);

    return (
      <FlatList
        data={groups}
        keyExtractor={item => item.key}
        renderItem={({item}) => {
          if (item.type === 'header') {
            return (
              <SectionHeader
                title={item.title}
                count={item.count}
                onPress={() => nav.push('project-view', {
                  projectId: item.projectId,
                  projectName: item.title,
                })}
              />
            );
          }
          return (
            <TaskRow
              task={item.task}
              onComplete={handleComplete}
              onPress={handleTaskPress}
            />
          );
        }}
        ItemSeparatorComponent={({leadingItem}) =>
          leadingItem?.type !== 'header' ? <View style={styles.separator} /> : null
        }
      />
    );
  };

  const renderUpcomingTab = () => {
    // Tasks due after today, grouped by date bucket
    const upcoming = tasks
      .filter(t => {
        const due = t.due?.date;
        return due && due > today;
      })
      .sort((a, b) => (a.due?.date || '').localeCompare(b.due?.date || ''));

    const noDue = tasks.filter(t => !t.due?.date);

    if (upcoming.length === 0 && noDue.length === 0) {
      return (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No upcoming tasks</Text>
        </View>
      );
    }

    const buckets = groupByDateBucket(upcoming, today);
    if (noDue.length > 0) {
      buckets.push({key: 'header-nodate', type: 'header' as const, title: 'No Date', count: noDue.length});
      noDue.forEach(t => buckets.push({key: t.id, type: 'task' as const, task: t}));
    }

    return (
      <FlatList
        data={buckets}
        keyExtractor={item => item.key}
        renderItem={({item}) => {
          if (item.type === 'header') {
            return <SectionHeader title={item.title} count={item.count} />;
          }
          return (
            <TaskRow
              task={item.task}
              onComplete={handleComplete}
              onPress={handleTaskPress}
              showProject={projectMap[item.task.project_id]}
            />
          );
        }}
        ItemSeparatorComponent={({leadingItem}) =>
          leadingItem?.type !== 'header' ? <View style={styles.separator} /> : null
        }
      />
    );
  };

  const renderProjectsTab = () => {
    // List of projects with task counts
    const projectCounts: Record<string, number> = {};
    tasks.forEach(t => {
      const pid = t.project_id || 'none';
      projectCounts[pid] = (projectCounts[pid] || 0) + 1;
    });

    const items = projectList
      .filter(p => (projectCounts[p.id] || 0) > 0)
      .map(p => ({...p, taskCount: projectCounts[p.id] || 0}));

    if (items.length === 0) {
      return (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No projects with active tasks</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={items}
        keyExtractor={item => item.id}
        renderItem={({item}) => (
          <Pressable
            style={styles.projectRow}
            onPress={() => nav.push('project-view', {
              projectId: item.id,
              projectName: item.name,
            })}>
            <Text style={styles.projectName}>{item.name}</Text>
            <View style={styles.projectMeta}>
              <Text style={styles.projectCount}>
                {item.taskCount} task{item.taskCount !== 1 ? 's' : ''}
              </Text>
              <Text style={styles.projectArrow}>{'>'}</Text>
            </View>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    );
  };

  const taskCount = tasks.length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>SuperTask</Text>
        <View style={styles.headerButtons}>
          <Pressable style={styles.headerButton} onPress={handleAddTask}>
            <Text style={styles.headerButtonText}>+</Text>
          </Pressable>
          <Pressable style={styles.headerButton} onPress={() => { log('TaskHome', 'LOG pressed'); nav.resetTo('debug'); }}>
            <Text style={styles.headerButtonText}>Log</Text>
          </Pressable>
          <Pressable style={styles.headerButton} onPress={() => { log('TaskHome', 'CLOSE pressed'); PluginManager.closePluginView(); }}>
            <Text style={styles.headerButtonText}>Close</Text>
          </Pressable>
        </View>
      </View>

      <TabBar tabs={TABS} activeTab={activeTab} onTabChange={(tab) => { log('TaskHome', `TAB changed: ${tab}`); setActiveTab(tab); }} />

      {renderThisPage()}

      <View style={styles.body}>
        {renderContent()}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {taskCount} task{taskCount !== 1 ? 's' : ''}
        </Text>
        <Pressable onPress={() => fetchData(true)}>
          <Text style={styles.footerRefresh}>Refresh</Text>
        </Pressable>
      </View>
    </View>
  );
}

// Group tasks by project, returning interleaved header + task items
function groupByProject(tasks: any[], projectMap: Record<string, string>): any[] {
  const groups: Record<string, any[]> = {};

  tasks.forEach(t => {
    const pid = t.project_id || 'inbox';
    if (!groups[pid]) groups[pid] = [];
    groups[pid].push(t);
  });

  const items: any[] = [];
  Object.entries(groups).forEach(([pid, projectTasks]) => {
    items.push({
      key: `header-${pid}`,
      type: 'header',
      title: projectMap[pid] || 'Inbox',
      count: projectTasks.length,
      projectId: pid,
    });
    projectTasks
      .sort((a, b) => (a.due?.date || '').localeCompare(b.due?.date || ''))
      .forEach(t => items.push({key: t.id, type: 'task', task: t}));
  });

  return items;
}

// Group tasks into date buckets: Tomorrow, This Week, Later
function groupByDateBucket(tasks: any[], today: string): any[] {
  const todayDate = new Date(today + 'T00:00:00');
  const tomorrow = new Date(todayDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  // End of this week (Sunday)
  const endOfWeek = new Date(todayDate);
  endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
  const endOfWeekStr = endOfWeek.toISOString().slice(0, 10);

  const buckets: {tomorrow: any[]; thisWeek: any[]; later: any[]} = {
    tomorrow: [],
    thisWeek: [],
    later: [],
  };

  tasks.forEach(t => {
    const due = t.due?.date;
    if (due === tomorrowStr) {
      buckets.tomorrow.push(t);
    } else if (due <= endOfWeekStr) {
      buckets.thisWeek.push(t);
    } else {
      buckets.later.push(t);
    }
  });

  const items: any[] = [];
  if (buckets.tomorrow.length) {
    items.push({key: 'header-tomorrow', type: 'header', title: 'Tomorrow', count: buckets.tomorrow.length});
    buckets.tomorrow.forEach(t => items.push({key: t.id, type: 'task', task: t}));
  }
  if (buckets.thisWeek.length) {
    items.push({key: 'header-thisweek', type: 'header', title: 'This Week', count: buckets.thisWeek.length});
    buckets.thisWeek.forEach(t => items.push({key: t.id, type: 'task', task: t}));
  }
  if (buckets.later.length) {
    items.push({key: 'header-later', type: 'header', title: 'Later', count: buckets.later.length});
    buckets.later.forEach(t => items.push({key: t.id, type: 'task', task: t}));
  }

  return items;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 4,
  },
  headerButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
  },
  thisPage: {
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
    backgroundColor: '#f8f8f8',
  },
  thisPageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  thisPageTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  thisPageCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
  },
  thisPageSeparator: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginLeft: 62,
  },
  body: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
  },
  errorText: {
    fontSize: 16,
    color: '#000000',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#666666',
  },
  separator: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginLeft: 62,
  },
  projectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  projectName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  projectMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  projectCount: {
    fontSize: 14,
    color: '#666666',
  },
  projectArrow: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#000000',
  },
  footerText: {
    fontSize: 13,
    color: '#666666',
  },
  footerRefresh: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
});
