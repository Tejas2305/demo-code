import React from 'react';

export const useCRUD = (initialData = []) => {
  const [data, setData] = React.useState(() => [...(initialData || [])]);
  const [editingRow, setEditingRow] = React.useState(null);
  const [formData, setFormData] = React.useState({});

  const handleEdit = (row) => {
    setEditingRow(row.index);
    setFormData({ ...row.original });
  };

  const handleDelete = (index) => {
    const newData = [...data];
    newData.splice(index, 1);
    setData(newData);
  };

  const handleAdd = () => {
    setEditingRow(null);
    setFormData({});
  };

  const handleSave = (formValues) => {
    if (editingRow !== null) {
      const newData = [...data];
      newData[editingRow] = formValues;
      setData(newData);
    } else {
      setData([...data, formValues]);
    }
  };

  const handleCancel = () => {
    setEditingRow(null);
    setFormData({});
  };

  return {
    data,
    setData,
    editingRow,
    setEditingRow,
    formData,
    setFormData,
    handleEdit,
    handleDelete,
    handleAdd,
    handleSave,
    handleCancel,
  };
};
