// Chakra imports
import {
  Box,
  Button,
  Flex,
  Icon,
  Text,
  useColorModeValue,
  Image,
  SimpleGrid,
  VStack,
} from "@chakra-ui/react";
// Custom components
import Card from "components/card/Card.js";
import React, { useState, useEffect } from "react";
// Assets
import { MdUpload, MdDelete } from "react-icons/md";
import Dropzone from "views/admin/profile/components/Dropzone";
import { useDataContext } from "contexts/DataContext";

export default function Upload(props) {
  const { used, total, ...rest } = props;
  const { tablesData, updateProfile } = useDataContext();
  const [uploadedImages, setUploadedImages] = useState([]);

  // Load images from sessionStorage on mount
  useEffect(() => {
    const savedImages = sessionStorage.getItem('profileImages');
    if (savedImages) {
      try {
        setUploadedImages(JSON.parse(savedImages));
      } catch (e) {
        console.error('Error loading profile images:', e);
      }
    }
  }, []);

  // Chakra Color Mode
  const textColorPrimary = useColorModeValue("secondaryGray.900", "white");
  const brandColor = useColorModeValue("brand.500", "white");
  const textColorSecondary = "gray.400";
  const cardBg = useColorModeValue("white", "gray.700");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.100");

  const handleImageDrop = (acceptedFiles) => {
    acceptedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newImage = {
          id: Date.now(),
          src: e.target.result,
          name: file.name,
          uploadDate: new Date().toLocaleDateString(),
        };
        const updatedImages = [...uploadedImages, newImage];
        setUploadedImages(updatedImages);
        // Save to sessionStorage
        sessionStorage.setItem('profileImages', JSON.stringify(updatedImages));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDeleteImage = (id) => {
    const updatedImages = uploadedImages.filter((img) => img.id !== id);
    setUploadedImages(updatedImages);
    sessionStorage.setItem('profileImages', JSON.stringify(updatedImages));
  };

  return (
    <Card {...rest} mb="20px" align="center" p="20px">
      <VStack w="100%" spacing="20px">
        {/* Upload Section */}
        <Flex h="100%" direction={{ base: "column", "2xl": "row" }} w="100%">
          <Dropzone
            w={{ base: "100%", "2xl": "268px" }}
            me="36px"
            maxH={{ base: "60%", lg: "50%", "2xl": "100%" }}
            minH={{ base: "60%", lg: "50%", "2xl": "100%" }}
            content={
              <Box>
                <Icon as={MdUpload} w="80px" h="80px" color={brandColor} />
                <Flex justify="center" mx="auto" mb="12px">
                  <Text fontSize="xl" fontWeight="700" color={brandColor}>
                    Upload Images
                  </Text>
                </Flex>
                <Text fontSize="sm" fontWeight="500" color="secondaryGray.500">
                  PNG, JPG and GIF files are allowed
                </Text>
              </Box>
            }
            onDrop={handleImageDrop}
          />
          <Flex direction="column" pe="44px" justify="space-between" w="100%">
            <Box>
              <Text
                color={textColorPrimary}
                fontWeight="bold"
                textAlign="start"
                fontSize="2xl"
                mt={{ base: "20px", "2xl": "0px" }}
              >
                Profile Gallery
              </Text>
              <Text
                color={textColorSecondary}
                fontSize="md"
                my="10px"
                textAlign="start"
              >
                Upload your profile photos and showcase your work. Your images are stored securely in your profile.
              </Text>
            </Box>
            <Text
              color={textColorSecondary}
              fontSize="sm"
              textAlign="start"
              mt="10px"
            >
              Total Images: <strong>{uploadedImages.length}</strong>
            </Text>
          </Flex>
        </Flex>

        {/* Images Gallery */}
        {uploadedImages.length > 0 && (
          <Box w="100%">
            <Text
              color={textColorPrimary}
              fontWeight="bold"
              fontSize="lg"
              mb="15px"
            >
              Your Images
            </Text>
            <SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} spacing="15px">
              {uploadedImages.map((image) => (
                <Box
                  key={image.id}
                  position="relative"
                  borderRadius="8px"
                  overflow="hidden"
                  bg={cardBg}
                  border={`1px solid ${borderColor}`}
                  _hover={{
                    "& .delete-btn": {
                      opacity: 1,
                    },
                  }}
                >
                  <Image
                    src={image.src}
                    alt={image.name}
                    w="100%"
                    h="150px"
                    objectFit="cover"
                  />
                  <VStack
                    className="delete-btn"
                    position="absolute"
                    top="0"
                    left="0"
                    right="0"
                    bottom="0"
                    bg="blackAlpha.700"
                    opacity="0"
                    justify="center"
                    transition="opacity 0.2s"
                    cursor="pointer"
                  >
                    <Button
                      size="sm"
                      colorScheme="red"
                      leftIcon={<Icon as={MdDelete} />}
                      onClick={() => handleDeleteImage(image.id)}
                    >
                      Delete
                    </Button>
                  </VStack>
                  <Box p="8px">
                    <Text fontSize="xs" color={textColorSecondary} noOfLines={1}>
                      {image.name}
                    </Text>
                    <Text fontSize="xs" color={textColorSecondary}>
                      {image.uploadDate}
                    </Text>
                  </Box>
                </Box>
              ))}
            </SimpleGrid>
          </Box>
        )}
      </VStack>
    </Card>
  );
}
