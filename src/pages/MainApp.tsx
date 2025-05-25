
import React, { useState } from 'react';
import Layout from '@/components/Layout';
import Dashboard from '@/components/Dashboard';
import TransactionForm from '@/components/TransactionForm';
import ProductManagement from '@/components/ProductManagement';
import CustomerList from '@/components/CustomerList';

const MainApp = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'transactions':
        return <TransactionForm />;
      case 'products':
        return <ProductManagement />;
      case 'customers':
        return <CustomerList />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </Layout>
  );
};

export default MainApp;
