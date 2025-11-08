import React, { useState } from "react";

interface NotionTask {
  id: string;
  title: string;
  status: string | null;
  date: string | null;
  type: string | null;
}

interface EditTaskModalProps {
  task: NotionTask;
  onClose: () => void;
  onTaskUpdated: () => void;
  taskTypes: string[];
}

const EditTaskModal: React.FC<EditTaskModalProps> = ({
  task,
  onClose,
  onTaskUpdated,
  taskTypes,
}) => {
  const [title, setTitle] = useState(task.title);
  const [status, setStatus] = useState(task.status || "未着手");
  const [selectedType, setSelectedType] = useState(task.type || "");
  const [newType, setNewType] = useState("");
  const [date, setDate] = useState(task.date || "");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const taskType = selectedType === "__new__" ? newType : selectedType;

    try {
      const response = await fetch(
        `http://localhost:8000/api/notion/tasks/${task.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title, status, task_type: taskType, date }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to update task");
      }

      onTaskUpdated();
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
        <h2>Edit Task</h2>
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
            <label>Deadline</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="form-actions">
            <button type="submit">Save Changes</button>
            <button type="button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTaskModal;
