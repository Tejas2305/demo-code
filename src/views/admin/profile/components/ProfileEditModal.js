import React, { useState } from 'react';
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
} from '@chakra-ui/react';

export default function ProfileEditModal({ isOpen, onClose, profileData, onSave }) {
  const [formData, setFormData] = useState(profileData);

  const handleSave = () => {
    onSave(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Edit Profile</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <FormControl mb="4">
            <FormLabel>Name</FormLabel>
            <Input
              name="name"
              value={formData.name || ''}
              onChange={handleChange}
              placeholder="Name"
            />
          </FormControl>
          <FormControl mb="4">
            <FormLabel>Job Title</FormLabel>
            <Input
              name="job"
              value={formData.job || ''}
              onChange={handleChange}
              placeholder="Job Title"
            />
          </FormControl>
          <FormControl mb="4">
            <FormLabel>Posts</FormLabel>
            <Input
              name="posts"
              value={formData.posts || ''}
              onChange={handleChange}
              placeholder="Posts"
            />
          </FormControl>
          <FormControl mb="4">
            <FormLabel>Followers</FormLabel>
            <Input
              name="followers"
              value={formData.followers || ''}
              onChange={handleChange}
              placeholder="Followers"
            />
          </FormControl>
          <FormControl mb="4">
            <FormLabel>Following</FormLabel>
            <Input
              name="following"
              value={formData.following || ''}
              onChange={handleChange}
              placeholder="Following"
            />
          </FormControl>
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="brand" mr={3} onClick={handleSave}>
            Save
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
