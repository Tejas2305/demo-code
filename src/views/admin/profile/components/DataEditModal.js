import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  VStack,
} from '@chakra-ui/react';

export default function DataEditModal({ isOpen, onClose, editingItem, onSave }) {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (editingItem) {
      setFormData({ ...editingItem });
    }
  }, [editingItem, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'progress' || name === 'value' ? Number(value) : value,
    }));
  };

  const handleSave = () => {
    if (editingItem) {
      onSave(formData);
    }
  };

  if (!editingItem) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Edit {editingItem.type} Record</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing="4">
            <FormControl>
              <FormLabel>Name</FormLabel>
              <Input
                name="name"
                value={formData.name || ''}
                onChange={handleChange}
                placeholder="Name"
              />
            </FormControl>

            {editingItem.status && (
              <FormControl>
                <FormLabel>Status</FormLabel>
                <Select
                  name="status"
                  value={formData.status || 'Approved'}
                  onChange={handleChange}
                >
                  <option value="Approved">Approved</option>
                  <option value="Disable">Disable</option>
                  <option value="Error">Error</option>
                </Select>
              </FormControl>
            )}

            {editingItem.email && (
              <FormControl>
                <FormLabel>Email</FormLabel>
                <Input
                  name="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={handleChange}
                  placeholder="Email"
                />
              </FormControl>
            )}

            {editingItem.domain && (
              <FormControl>
                <FormLabel>Domain</FormLabel>
                <Input
                  name="domain"
                  value={formData.domain || ''}
                  onChange={handleChange}
                  placeholder="Domain"
                />
              </FormControl>
            )}

            {editingItem.platform && (
              <FormControl>
                <FormLabel>Platform</FormLabel>
                <Input
                  name="platform"
                  value={formData.platform || ''}
                  onChange={handleChange}
                  placeholder="Platform"
                />
              </FormControl>
            )}

            {editingItem.solution && (
              <FormControl>
                <FormLabel>Solution</FormLabel>
                <Input
                  name="solution"
                  value={formData.solution || ''}
                  onChange={handleChange}
                  placeholder="Solution"
                />
              </FormControl>
            )}

            {editingItem.progress !== undefined && (
              <FormControl>
                <FormLabel>Progress (%)</FormLabel>
                <Input
                  name="progress"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.progress || 0}
                  onChange={handleChange}
                  placeholder="0-100"
                />
              </FormControl>
            )}

            {editingItem.date && (
              <FormControl>
                <FormLabel>Date</FormLabel>
                <Input
                  name="date"
                  value={formData.date || ''}
                  onChange={handleChange}
                  placeholder="Date"
                />
              </FormControl>
            )}

            {editingItem.value && (
              <FormControl>
                <FormLabel>Value ($)</FormLabel>
                <Input
                  name="value"
                  type="number"
                  value={formData.value || 0}
                  onChange={handleChange}
                  placeholder="Value"
                />
              </FormControl>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="brand" mr={3} onClick={handleSave}>
            Save Changes
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
