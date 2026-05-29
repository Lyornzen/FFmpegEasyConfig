import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { TaskItem } from '../components/TaskQueue';

interface TaskContextType {
  tasks: TaskItem[];
  addTask: (task: TaskItem) => void;
  updateTask: (key: string, updates: Partial<TaskItem>) => void;
  removeTask: (key: string) => void;
  clearTasks: () => void;
}

const TaskContext = createContext<TaskContextType>({
  tasks: [],
  addTask: () => {},
  updateTask: () => {},
  removeTask: () => {},
  clearTasks: () => {},
});

export function TaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);

  const addTask = useCallback((task: TaskItem) => {
    setTasks((prev) => [...prev, task]);
  }, []);

  const updateTask = useCallback((key: string, updates: Partial<TaskItem>) => {
    setTasks((prev) =>
      prev.map((t) => (t.key === key ? { ...t, ...updates } : t))
    );
  }, []);

  const removeTask = useCallback((key: string) => {
    setTasks((prev) => prev.filter((t) => t.key !== key));
  }, []);

  const clearTasks = useCallback(() => {
    setTasks([]);
  }, []);

  return (
    <TaskContext.Provider value={{ tasks, addTask, updateTask, removeTask, clearTasks }}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTaskContext() {
  return useContext(TaskContext);
}
