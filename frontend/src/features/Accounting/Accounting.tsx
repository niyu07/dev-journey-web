import React, { useState, useEffect } from 'react';
import './Accounting.css';

interface AccountingEntry {
  id: string;
  date: string;
  entry_type: string;
  amount: number;
  category: string;
  description: string;
  classification: string;
}

const classificationOptions = [
  '個人',
  '個人事業主',
];

const Accounting: React.FC = () => {
  const [entries, setEntries] = useState<AccountingEntry[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [entryType, setEntryType] = useState('経費');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [classification, setClassification] = useState(classificationOptions[0]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [receiptProcessed, setReceiptProcessed] = useState(false);

  const fetchEntries = async () => {
    setError(null);
    try {
      const response = await fetch('http://localhost:8000/api/accounting');
      if (!response.ok) {
        throw new Error('Failed to fetch accounting entries');
      }
      const data = await response.json();
      setEntries(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred while fetching entries');
      }
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/accounting/categories');
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      const data = await response.json();
      setCategoryOptions(data);
      if (data.length > 0 && !editingId) {
        setCategory(data[0]);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred while fetching categories');
      }
    }
  };

  useEffect(() => {
    fetchEntries();
    fetchCategories();
  }, []);

  const handleAddCategory = async () => {
    const newCategory = window.prompt('新しいカテゴリ名を入力してください:');
    if (newCategory && !categoryOptions.includes(newCategory)) {
      try {
        const response = await fetch('http://localhost:8000/api/accounting/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category: newCategory }),
        });
        if (!response.ok) throw new Error('Failed to add category');
        await fetchCategories();
        setCategory(newCategory);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      }
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setDate(new Date().toISOString().split('T')[0]);
    setEntryType('経費');
    setAmount('');
    setCategory(categoryOptions.length > 0 ? categoryOptions[0] : '');
    setDescription('');
    setClassification(classificationOptions[0]);
    setSelectedFile(null);
    setReceiptProcessed(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (editingId) {
      // Update logic
      const response = await fetch(`http://localhost:8000/api/accounting/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, entry_type: entryType, amount: parseFloat(amount), category, description, classification }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update entry');
      }
    } else {
      // Create logic
      if (classification === '個人事業主' && entryType === '経費' && !receiptProcessed) {
        setError('個人事業主の経費を登録するには、レシートのアップロードが必要です。');
        return;
      }
      const response = await fetch('http://localhost:8000/api/accounting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, entry_type: entryType, amount: parseFloat(amount), category, description, classification }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to add entry');
      }
    }

    resetForm();
    fetchEntries();
  };

  const handleEdit = (entry: AccountingEntry) => {
    setEditingId(entry.id);
    setDate(entry.date);
    setEntryType(entry.entry_type);
    setAmount(entry.amount.toString());
    setCategory(entry.category);
    setDescription(entry.description);
    setClassification(entry.classification);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('この項目を削除してもよろしいですか？')) {
      try {
        const response = await fetch(`http://localhost:8000/api/accounting/${id}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          throw new Error('Failed to delete entry');
        }
        fetchEntries();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      }
    }
  };

  const handleReceiptUpload = async () => {
    if (!selectedFile) return;
    const formData = new FormData();
    formData.append('file', selectedFile);
    try {
      const response = await fetch('http://localhost:8000/api/accounting/receipt', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Failed to process receipt');
      const data = await response.json();
      if (data.date) setDate(data.date);
      if (data.description) setDescription(data.description);
      if (data.amount) setAmount(data.amount.toString());
      setReceiptProcessed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  const isFormValid = date && amount && category && description && classification;

  return (
    <div className="accounting-container">
      <h2>Accounting Management</h2>
      {error && <div className="error-message">{error}</div>}
      <div className="accounting-form-section">
        <h3>{editingId ? 'Edit Entry' : 'Add New Entry'}</h3>
        <form onSubmit={handleSubmit} className="add-entry-form">
          {!editingId && (
            <div className="form-group">
              <label>Receipt</label>
              <input type="file" onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)} />
              <button type="button" onClick={handleReceiptUpload} disabled={!selectedFile}>Upload Receipt</button>
            </div>
          )}
                      <div className="form-row">
                        <div className="form-group">
                          <label>Date</label>
                          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                        </div>
                        <div className="form-group">
                          <label>Amount</label>
                          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Type</label>
                          <select value={entryType} onChange={(e) => setEntryType(e.target.value)} required>
                            <option value="経費">Expense</option>
                            <option value="売上">Sale</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Classification</label>
                          <select value={classification} onChange={(e) => setClassification(e.target.value)} required>
                            {classificationOptions.map(option => <option key={option} value={option}>{option}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Category</label>
                        <div className="category-selection">
                          <select value={category} onChange={(e) => setCategory(e.target.value)} required>
                            {categoryOptions.map(option => <option key={option} value={option}>{option}</option>)}
                          </select>
                          <button type="button" onClick={handleAddCategory}>+</button>
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Description</label>
                        <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} required />
                      </div>          <div className="form-actions">
            <button type="submit" disabled={!isFormValid}>{editingId ? 'Update Entry' : 'Add Entry'}</button>
            {editingId && <button type="button" onClick={resetForm}>Cancel Edit</button>}
          </div>
        </form>
      </div>
      <div className="accounting-display-section">
        <h3>Entries</h3>
        <table className="accounting-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Classification</th>
              <th>Amount</th>
              <th>Category</th>
              <th>Description</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(entry => (
              <tr key={entry.id}>
                <td>{entry.date}</td>
                <td>{entry.entry_type}</td>
                <td>{entry.classification}</td>
                <td className={entry.entry_type === '経費' ? 'amount-expense' : 'amount-sale'}>{entry.amount}</td>
                <td>{entry.category}</td>
                <td>{entry.description}</td>
                <td>
                  <button onClick={() => handleEdit(entry)}>Edit</button>
                  <button onClick={() => handleDelete(entry.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Accounting;
