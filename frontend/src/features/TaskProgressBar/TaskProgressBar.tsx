import React from 'react';
import './TaskProgressBar.css';

interface Task {
  status: string;
}

interface TaskProgressBarProps {
  title: string;
  tasks: Task[];
}

const TaskProgressBar: React.FC<TaskProgressBarProps> = ({ title, tasks }) => {
  const completedTasks = tasks.filter(task => task.status === 'Done').length;
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <div className="progress-bar-container">
      <div className="progress-bar-header">
        <span>{title}</span>
        <span>{completedTasks} / {totalTasks}</span>
      </div>
      <div className="progress-bar-background">
        <div 
          className="progress-bar-foreground"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
};

export default TaskProgressBar;
