import React, { createContext, useState, useContext, useEffect } from 'react';

const DataContext = createContext();

const defaultTablesData = {
  complex: [
    { name: 'Marketplace', status: 'Approved', date: '04.11.21', progress: 100 },
    { name: 'Venus DB PRO', status: 'Disable', date: '04.11.21', progress: 40 },
    { name: 'Marketplace', status: 'Error', date: '04.11.21', progress: 80 },
  ],
  check: [
    { name: 'Marketplace', email: 'john@example.com', domain: 'marketplace.com', status: 'Approved' },
    { name: 'Venus DB', email: 'venus@example.com', domain: 'venusdb.com', status: 'Disable' },
  ],
  development: [
    { name: 'Chakra UI Version', platform: 'Windows', progress: 100, date: '25 Jan 2021' },
    { name: 'Angular', platform: 'Mac', progress: 79, date: '5 Feb 2021' },
  ],
  columns: [
    { name: 'Marketplace', solution: 'Django', status: 'Approved', value: 2500 },
    { name: 'Venus', solution: 'Flask', status: 'Approved', value: 1800 },
  ],
  profile: {
    name: 'Adela Parkson',
    job: 'Product Designer',
    posts: '17',
    followers: '9.7k',
    following: '274',
    avatar: 'avatar4.png',
  },
};

export const DataProvider = ({ children }) => {
  const [tablesData, setTablesData] = useState(() => {
    try {
      const saved = sessionStorage.getItem('tablesData');
      return saved ? JSON.parse(saved) : defaultTablesData;
    } catch (error) {
      console.error('Error loading data from sessionStorage:', error);
      return defaultTablesData;
    }
  });

  // Save to sessionStorage whenever data changes (resets on server restart/browser session end)
  useEffect(() => {
    try {
      sessionStorage.setItem('tablesData', JSON.stringify(tablesData));
    } catch (error) {
      console.error('Error saving data to sessionStorage:', error);
    }
  }, [tablesData]);

  const updateComplexTable = (newData) => {
    setTablesData((prev) => ({ ...prev, complex: newData }));
  };

  const updateCheckTable = (newData) => {
    setTablesData((prev) => ({ ...prev, check: newData }));
  };

  const updateDevelopmentTable = (newData) => {
    setTablesData((prev) => ({ ...prev, development: newData }));
  };

  const updateColumnsTable = (newData) => {
    setTablesData((prev) => ({ ...prev, columns: newData }));
  };

  const updateProfile = (newData) => {
    setTablesData((prev) => ({ ...prev, profile: newData }));
  };

  return (
    <DataContext.Provider
      value={{
        tablesData,
        updateComplexTable,
        updateCheckTable,
        updateDevelopmentTable,
        updateColumnsTable,
        updateProfile,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useDataContext = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useDataContext must be used within DataProvider');
  }
  return context;
};
