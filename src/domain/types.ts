export type Day = string;
export type TaskStatus = 'waiting' | 'active' | 'done';

export interface Employee {
  id: string;
  name: string;
  role: string;
  order: number;
}

export interface Task {
  id: string;
  title: string;
  shortLabel: string;
  employeeId: string;
  startDay: Day | null;
  endDay: Day | null;
  status: TaskStatus;
  linkedTaskId: string | null;
  routine: boolean;
  order: number;
}

export interface Plan {
  id: string;
  title: string;
  reportDay: Day;
  rangeStart: Day;
  rangeEnd: Day;
  createdAt: string;
  tasks: Task[];
}

export interface Revision {
  id: string;
  planId: string;
  at: string;
  action: string;
  editorName: string | null;
  planSnapshot: Plan;
}

export interface Project {
  schemaVersion: 1;
  employees: Employee[];
  plans: Plan[];
  revisions: Revision[];
}
