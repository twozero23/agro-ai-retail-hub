
import React, { useState } from 'react';
import Layout from '@/components/Layout';
import Dashboard from '@/components/Dashboard';
import TransactionForm from '@/components/TransactionForm';
import ProductManagement from '@/components/ProductManagement';
import CustomerList from '@/components/CustomerList';
import Reports from '@/components/Reports';

const MainApp = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onTabChange={setActiveTab} />;
      case 'transactions':
        return <TransactionForm />;
      case 'products':
        return <ProductManagement />;
      case 'customers':
        return <CustomerList />;
      case 'reports':
        return <Reports />;
      default:
        return <Dashboard onTabChange={setActiveTab} />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </Layout>
  );
};

export default MainApp;
