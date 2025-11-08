import React, { useState, useEffect, useMemo } from "react";
import "./NotionTasks.css";
import AddTaskModal from "./AddTaskModal";
import EditTaskModal from "./EditTaskModal";
import "./AddTaskModal.css";
import TaskProgressBar from "../TaskProgressBar/TaskProgressBar";

export interface NotionTask {
  id: string;
  title: string;
  status: string | null;
  date: string | null;
  type: string | null;
  project: string | null;
}

const NotionTasks: React.FC = () => {
  const [tasks, setTasks] = useState<NotionTask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<NotionTask | null>(null);

  const fetchTasks = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/notion/tasks");
      if (!response.ok) {
        throw new Error("Failed to fetch Notion tasks");
      }
      const data = await response.json();
      setTasks(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred");
      }
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleStatusChange = async (task: NotionTask, newStatus: string) => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/notion/tasks/${task.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: newStatus }),
        },
      );
      if (!response.ok) {
        throw new Error("Failed to update task status");
      }
      fetchTasks();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred while updating status");
      }
    }
  };

  const handleDelete = async (taskId: string) => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      try {
        const response = await fetch(
          `http://localhost:8000/api/notion/tasks/${taskId}`,
          {
            method: "DELETE",
          },
        );
        if (!response.ok) {
          throw new Error("Failed to delete task");
        }
        fetchTasks();
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("An unknown error occurred while deleting task");
        }
      }
    }
  };

  const handleEdit = (task: NotionTask) => {
    setEditingTask(task);
    setIsEditModalOpen(true);
  };

  const { dailyTasks, monthlyTasks, projectTasks, projectOptions } =
    useMemo(() => {
      const today = new Date();
      const todayString = today.toISOString().split("T")[0];

      const daily = tasks.filter((task) => task.date === todayString);
      const monthly = tasks.filter((task) => {
        if (!task.date) return false;
        const taskDate = new Date(task.date);
        return (
          taskDate.getFullYear() === selectedDate.getFullYear() &&
          taskDate.getMonth() === selectedDate.getMonth()
        );
      });

      const projects = Array.from(
        new Set(tasks.map((task) => task.project).filter(Boolean)),
      ) as string[];

      const project =
        selectedProject === "all"
          ? []
          : tasks.filter((task) => task.project === selectedProject);

      return {
        dailyTasks: daily,
        monthlyTasks: monthly,
        projectTasks: project,
        projectOptions: projects,
      };
    }, [tasks, selectedDate, selectedProject]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (task.status === "完了") return false;
      if (!task.date) return false;
      const taskDate = new Date(task.date);
      const isInMonth =
        taskDate.getFullYear() === selectedDate.getFullYear() &&
        taskDate.getMonth() === selectedDate.getMonth();
      const isinProject =
        selectedProject === "all" || task.project === selectedProject;
      return isInMonth && isinProject;
    });
  }, [tasks, selectedDate, selectedProject]);

  const groupedTasks = useMemo(() => {
    return filteredTasks.reduce(
      (acc, task) => {
        const type = task.type || "Uncategorized";
        if (!acc[type]) {
          acc[type] = [];
        }
        acc[type].push(task);
        return acc;
      },
      {} as Record<string, NotionTask[]>,
    );
  }, [filteredTasks]);

  const uniqueTaskTypes = useMemo(() => {
    const types = new Set(
      tasks.map((task) => task.type).filter(Boolean) as string[],
    );
    return Array.from(types);
  }, [tasks]);

  const goToPreviousMonth = () => {
    setSelectedDate(
      new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1),
    );
  };

  const goToNextMonth = () => {
    setSelectedDate(
      new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1),
    );
  };

  if (error) {
    return <div className="notion-tasks-container">Error: {error}</div>;
  }

  return (
    <div className="notion-tasks-container">
      <div className="header">
        <h2>Notion Tasks</h2>
        <div className="month-selector">
          <button onClick={goToPreviousMonth}>&lt;</button>
          <span>
            {selectedDate.toLocaleString("default", {
              month: "long",
              year: "numeric",
            })}
          </span>
          <button onClick={goToNextMonth}>&gt;</button>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="add-task-btn"
        >
          Add Task
        </button>
      </div>

      <div className="progress-section">
        <TaskProgressBar title="Today's Progress" tasks={dailyTasks} />
        <TaskProgressBar title="This Month's Progress" tasks={monthlyTasks} />
        {projectOptions.length > 0 && (
          <div>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="project-filter"
            >
              <option value="all">All Projects</option>
              {projectOptions.map((proj) => (
                <option key={proj} value={proj}>
                  {proj}
                </option>
              ))}
            </select>
            {selectedProject !== "all" && (
              <TaskProgressBar
                title={`${selectedProject} Progress`}
                tasks={projectTasks}
              />
            )}
          </div>
        )}
      </div>

      <div className="task-columns">
        {Object.entries(groupedTasks).map(([type, tasksInGroup]) => (
          <div key={type} className="task-column">
            <h3>{type}</h3>
            <ul>
              {tasksInGroup.map((task) => (
                <li key={task.id} className={`task-item status-${task.status}`}>
                  <span className="title">{task.title}</span>
                  <div className="task-actions">
                    <select
                      value={task.status || ""}
                      onChange={(e) => handleStatusChange(task, e.target.value)}
                      className="status-select"
                    >
                      <option value="未着手">未着手</option>
                      <option value="進行中">進行中</option>
                      <option value="完了">完了</option>
                    </select>
                    <button
                      onClick={() => handleEdit(task)}
                      className="edit-btn"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="delete-btn"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {isAddModalOpen && (
        <AddTaskModal
          onClose={() => setIsAddModalOpen(false)}
          onTaskAdded={fetchTasks}
          taskTypes={uniqueTaskTypes}
          projectOptions={projectOptions}
        />
      )}
      {isEditModalOpen && editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setIsEditModalOpen(false)}
          onTaskUpdated={fetchTasks}
          taskTypes={uniqueTaskTypes}
        />
      )}
    </div>
  );
};

export default NotionTasks;
