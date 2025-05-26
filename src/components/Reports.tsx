
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileSpreadsheet, Import, Export } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Reports = () => {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const { data: salesReport, isLoading } = useQuery({
    queryKey: ['sales-report'],
    queryFn: async () => {
      const { data } = await supabase
        .from('transactions')
        .select(`
          *,
          customers(name, phone),
          transaction_items(
            quantity,
            subtotal,
            products(name, brand, price_per_bag)
          )
        `)
        .order('created_at', { ascending: false });

      return data || [];
    }
  });

  const { data: productReport } = useQuery({
    queryKey: ['product-report'],
    queryFn: async () => {
      const { data } = await supabase
        .from('transaction_items')
        .select(`
          quantity,
          subtotal,
          products(name, brand, price_per_bag)
        `);

      const productSales = data?.reduce((acc: any, item) => {
        const productKey = `${item.products?.name} - ${item.products?.brand}`;
        if (!acc[productKey]) {
          acc[productKey] = {
            product: item.products?.name,
            brand: item.products?.brand,
            price: item.products?.price_per_bag,
            totalQuantity: 0,
            totalRevenue: 0
          };
        }
        acc[productKey].totalQuantity += item.quantity;
        acc[productKey].totalRevenue += Number(item.subtotal);
        return acc;
      }, {});

      return Object.values(productSales || {});
    }
  });

  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      toast({
        title: "No data to export",
        description: "There's no data available for export.",
        variant: "destructive"
      });
      return;
    }

    const headers = Object.keys(data[0]).join(',');
    const csvContent = [
      headers,
      ...data.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: `${filename} has been exported successfully.`
    });
  };

  const exportSalesReport = () => {
    setIsExporting(true);
    const salesData = salesReport?.map(transaction => ({
      'Invoice Number': transaction.invoice_number,
      'Customer Name': transaction.customers?.name || 'N/A',
      'Customer Phone': transaction.customers?.phone || 'N/A',
      'Total Amount (PKR)': transaction.total_amount,
      'Total Bags': transaction.total_bags,
      'Date': new Date(transaction.created_at).toLocaleDateString(),
      'Products': transaction.transaction_items?.map((item: any) => 
        `${item.products?.name} (${item.quantity})`
      ).join('; ') || 'N/A'
    })) || [];
    
    exportToCSV(salesData, 'sales_report');
    setIsExporting(false);
  };

  const exportProductReport = () => {
    setIsExporting(true);
    const productData = productReport?.map((product: any) => ({
      'Product Name': product.product,
      'Brand': product.brand,
      'Price per Bag (PKR)': product.price,
      'Total Quantity Sold': product.totalQuantity,
      'Total Revenue (PKR)': product.totalRevenue
    })) || [];
    
    exportToCSV(productData, 'product_report');
    setIsExporting(false);
  };

  const handleImport = () => {
    toast({
      title: "Import feature",
      description: "Import functionality will be available in the next update. For now, you can manually add data through the forms."
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-green-800">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <div className="flex gap-2">
          <Button onClick={handleImport} variant="outline">
            <Import className="h-4 w-4 mr-2" />
            Import Data
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Sales Report
            </CardTitle>
            <CardDescription>
              Complete transaction history with customer details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Total Transactions: {salesReport?.length || 0}
                </p>
                <Button 
                  onClick={exportSalesReport} 
                  disabled={isExporting}
                  size="sm"
                >
                  <Export className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
              
              <div className="max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesReport?.slice(0, 5).map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">
                          {transaction.invoice_number}
                        </TableCell>
                        <TableCell>{transaction.customers?.name || 'N/A'}</TableCell>
                        <TableCell>PKR {Number(transaction.total_amount).toLocaleString()}</TableCell>
                        <TableCell>
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {(salesReport?.length || 0) > 5 && (
                <p className="text-xs text-muted-foreground text-center">
                  Showing 5 of {salesReport?.length} transactions. Export for complete data.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Product Performance Report
            </CardTitle>
            <CardDescription>
              Sales performance by product and brand
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Products Sold: {productReport?.length || 0}
                </p>
                <Button 
                  onClick={exportProductReport} 
                  disabled={isExporting}
                  size="sm"
                >
                  <Export className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
              
              <div className="max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Sold</TableHead>
                      <TableHead>Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productReport?.slice(0, 5).map((product: any, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{product.product}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{product.brand}</Badge>
                        </TableCell>
                        <TableCell>{product.totalQuantity} bags</TableCell>
                        <TableCell>PKR {Number(product.totalRevenue).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {(productReport?.length || 0) > 5 && (
                <p className="text-xs text-muted-foreground text-center">
                  Showing 5 of {productReport?.length} products. Export for complete data.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Export Options</CardTitle>
          <CardDescription>
            Export your data to Excel or Google Sheets compatible formats
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">Excel Export</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  CSV files can be opened directly in Microsoft Excel
                </p>
                <div className="space-y-2">
                  <Button onClick={exportSalesReport} variant="outline" className="w-full">
                    <Export className="h-4 w-4 mr-2" />
                    Export Sales to CSV
                  </Button>
                  <Button onClick={exportProductReport} variant="outline" className="w-full">
                    <Export className="h-4 w-4 mr-2" />
                    Export Products to CSV
                  </Button>
                </div>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">Google Sheets</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Import CSV files into Google Sheets via File → Import
                </p>
                <div className="space-y-2">
                  <Button onClick={exportSalesReport} variant="outline" className="w-full">
                    <Export className="h-4 w-4 mr-2" />
                    Export Sales to CSV
                  </Button>
                  <Button onClick={exportProductReport} variant="outline" className="w-full">
                    <Export className="h-4 w-4 mr-2" />
                    Export Products to CSV
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
