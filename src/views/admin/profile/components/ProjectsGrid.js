// Chakra imports
import {
  Box,
  Grid,
  Text,
  useColorModeValue,
  Card as ChakraCard,
  Button,
  Icon,
  Flex,
  Badge,
  useDisclosure,
} from "@chakra-ui/react";
import React, { useState } from "react";
import { MdEdit, MdDelete } from "react-icons/md";
import Card from "components/card/Card.js";
import { useDataContext } from "contexts/DataContext";
import DataEditModal from "./DataEditModal";

export default function ProjectsGrid() {
  const { tablesData, updateComplexTable, updateCheckTable, updateDevelopmentTable, updateColumnsTable } = useDataContext();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [editingItem, setEditingItem] = useState(null);
  const textColorPrimary = useColorModeValue("secondaryGray.900", "white");
  const textColorSecondary = "gray.400";
  const cardBg = useColorModeValue("white", "gray.700");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.100");

  // Combine all table data for display
  const allData = [
    ...tablesData.complex.map((item, idx) => ({ ...item, type: "Complex", originalIndex: idx, tableType: "complex" })),
    ...tablesData.check.map((item, idx) => ({ ...item, type: "Check", originalIndex: idx, tableType: "check" })),
    ...tablesData.development.map((item, idx) => ({ ...item, type: "Development", originalIndex: idx, tableType: "development" })),
    ...tablesData.columns.map((item, idx) => ({ ...item, type: "Columns", originalIndex: idx, tableType: "columns" })),
  ];

  const handleEdit = (item) => {
    setEditingItem(item);
    onOpen();
  };

  const handleDelete = (item) => {
    if (item.tableType === "complex") {
      const newData = tablesData.complex.filter((_, idx) => idx !== item.originalIndex);
      updateComplexTable(newData);
    } else if (item.tableType === "check") {
      const newData = tablesData.check.filter((_, idx) => idx !== item.originalIndex);
      updateCheckTable(newData);
    } else if (item.tableType === "development") {
      const newData = tablesData.development.filter((_, idx) => idx !== item.originalIndex);
      updateDevelopmentTable(newData);
    } else if (item.tableType === "columns") {
      const newData = tablesData.columns.filter((_, idx) => idx !== item.originalIndex);
      updateColumnsTable(newData);
    }
  };

  const handleSave = (updatedData) => {
    if (!editingItem) return;
    
    if (editingItem.tableType === "complex") {
      const newData = [...tablesData.complex];
      newData[editingItem.originalIndex] = updatedData;
      updateComplexTable(newData);
    } else if (editingItem.tableType === "check") {
      const newData = [...tablesData.check];
      newData[editingItem.originalIndex] = updatedData;
      updateCheckTable(newData);
    } else if (editingItem.tableType === "development") {
      const newData = [...tablesData.development];
      newData[editingItem.originalIndex] = updatedData;
      updateDevelopmentTable(newData);
    } else if (editingItem.tableType === "columns") {
      const newData = [...tablesData.columns];
      newData[editingItem.originalIndex] = updatedData;
      updateColumnsTable(newData);
    }
    
    onClose();
  };

  return (
    <Card mb={{ base: "0px", "2xl": "20px" }}>
      <Text
        color={textColorPrimary}
        fontWeight="bold"
        fontSize="2xl"
        mt="10px"
        mb="4px"
      >
        Data Gallery
      </Text>
      <Text color={textColorSecondary} fontSize="md" me="26px" mb="40px">
        View and manage all your data in a beautiful Pinterest-style layout
      </Text>

      <Grid
        templateColumns={{
          base: "1fr",
          md: "repeat(2, 1fr)",
          lg: "repeat(3, 1fr)",
          xl: "repeat(4, 1fr)",
        }}
        gap="20px"
      >
        {allData.map((item, index) => (
          <ChakraCard
            key={index}
            bg={cardBg}
            border={`1px solid ${borderColor}`}
            borderRadius="12px"
            p="20px"
            transition="all 0.3s ease"
            _hover={{
              transform: "translateY(-5px)",
              boxShadow: "0px 10px 30px rgba(0, 0, 0, 0.15)",
            }}
          >
            {/* Type Badge */}
            <Flex justify="space-between" align="center" mb="10px">
              <Badge colorScheme="brand" fontSize="xs">
                {item.type}
              </Badge>
            </Flex>

            {/* Content */}
            <Box mb="15px">
              <Text fontWeight="600" fontSize="md" color={textColorPrimary} mb="8px">
                {item.name}
              </Text>

              {item.status && (
                <Flex align="center" mb="8px">
                  <Text fontSize="sm" color={textColorSecondary} me="8px">
                    Status:
                  </Text>
                  <Badge
                    colorScheme={
                      item.status === "Approved"
                        ? "green"
                        : item.status === "Disable"
                        ? "red"
                        : "orange"
                    }
                    fontSize="xs"
                  >
                    {item.status}
                  </Badge>
                </Flex>
              )}

              {item.email && (
                <Text fontSize="sm" color={textColorSecondary} mb="8px">
                  {item.email}
                </Text>
              )}

              {item.platform && (
                <Text fontSize="sm" color={textColorSecondary} mb="8px">
                  <strong>Platform:</strong> {item.platform}
                </Text>
              )}

              {item.domain && (
                <Text fontSize="sm" color={textColorSecondary} mb="8px">
                  <strong>Domain:</strong> {item.domain}
                </Text>
              )}

              {item.solution && (
                <Text fontSize="sm" color={textColorSecondary} mb="8px">
                  <strong>Solution:</strong> {item.solution}
                </Text>
              )}

              {(item.progress || item.progress === 0) && (
                <Box>
                  <Flex justify="space-between" mb="5px">
                    <Text fontSize="sm" color={textColorSecondary}>
                      Progress
                    </Text>
                    <Text fontSize="sm" fontWeight="600" color={textColorPrimary}>
                      {item.progress}%
                    </Text>
                  </Flex>
                  <Box bg="gray.200" borderRadius="full" h="6px" w="100%">
                    <Box
                      bg="brand.500"
                      h="100%"
                      borderRadius="full"
                      w={`${item.progress}%`}
                      transition="width 0.3s ease"
                    />
                  </Box>
                </Box>
              )}

              {item.value && (
                <Text fontSize="sm" color={textColorSecondary} mt="10px">
                  <strong>Value:</strong> ${item.value}
                </Text>
              )}

              {item.date && (
                <Text fontSize="xs" color={textColorSecondary} mt="10px">
                  {item.date}
                </Text>
              )}
            </Box>

            {/* Actions */}
            <Flex gap="10px" justify="flex-end">
              <Button
                size="sm"
                variant="ghost"
                leftIcon={<Icon as={MdEdit} w="18px" h="18px" />}
                colorScheme="brand"
                onClick={() => handleEdit(item)}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                leftIcon={<Icon as={MdDelete} w="18px" h="18px" />}
                colorScheme="red"
                onClick={() => handleDelete(item)}
              >
                Delete
              </Button>
            </Flex>
          </ChakraCard>
        ))}
      </Grid>
      
      {editingItem && (
        <DataEditModal
          isOpen={isOpen}
          onClose={onClose}
          editingItem={editingItem}
          onSave={handleSave}
        />
      )}
    </Card>
  );
}
