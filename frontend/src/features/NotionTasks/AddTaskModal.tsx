import React, { useState } from "react";

interface AddTaskModalProps {
  onClose: () => void;
  onTaskAdded: () => void;
  taskTypes: string[];
  projectOptions: string[];
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({
  onClose,
  onTaskAdded,
  taskTypes,
  projectOptions,
}) => {
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("未着手");
  const [selectedType, setSelectedType] = useState("");
  const [newType, setNewType] = useState("");
  const [date, setDate] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [newProject, setNewProject] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const taskType = selectedType === "__new__" ? newType : selectedType;
    if (!taskType) {
      setError("Please select or create a type.");
      return;
    }

    const project =
      selectedProject === "__new__" ? newProject : selectedProject;

    try {
      const response = await fetch("http://localhost:8000/api/notion/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          status,
          task_type: taskType,
          date,
          project,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to add task");
      }

      onTaskAdded();
      onClose();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred");
      }
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Add New Task</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="未着手">未着手</option>
              <option value="進行中">進行中</option>
              <option value="完了">完了</option>
            </select>
          </div>
          <div className="form-group">
            <label>Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              required
            >
              <option value="" disabled>
                Select a type
              </option>
              {taskTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
              <option value="__new__">Create new type...</option>
            </select>
            {selectedType === "__new__" && (
              <input
                type="text"
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                placeholder="Enter new type name"
                required
              />
            )}
          </div>
          <div className="form-group">
            <label>Project</label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
            >
              <option value="">No Project</option>
              {projectOptions.map((proj) => (
                <option key={proj} value={proj}>
                  {proj}
                </option>
              ))}
              <option value="__new__">Create new project...</option>
            </select>
            {selectedProject === "__new__" && (
              <input
                type="text"
                value={newProject}
                onChange={(e) => setNewProject(e.target.value)}
                placeholder="Enter new project name"
                required
              />
            )}
          </div>
          <div className="form-group">
            <label>Deadline</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="form-actions">
            <button type="submit">Add Task</button>
            <button type="button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTaskModal;
