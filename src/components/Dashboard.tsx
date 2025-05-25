
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ShoppingCart, Users, Package, TrendingUp } from 'lucide-react';

const Dashboard = () => {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [transactionsResult, customersResult, productsResult, recentTransactions] = await Promise.all([
        supabase.from('transactions').select('total_amount, total_bags, created_at'),
        supabase.from('customers').select('id'),
        supabase.from('products').select('id'),
        supabase
          .from('transactions')
          .select(`
            *,
            customers(name),
            transaction_items(
              quantity,
              products(name, brand)
            )
          `)
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      const totalRevenue = transactionsResult.data?.reduce((sum, t) => sum + Number(t.total_amount), 0) || 0;
      const totalBags = transactionsResult.data?.reduce((sum, t) => sum + t.total_bags, 0) || 0;

      return {
        totalTransactions: transactionsResult.data?.length || 0,
        totalCustomers: customersResult.data?.length || 0,
        totalProducts: productsResult.data?.length || 0,
        totalRevenue,
        totalBags,
        recentTransactions: recentTransactions.data || []
      };
    }
  });

  const { data: salesByBrand } = useQuery({
    queryKey: ['sales-by-brand'],
    queryFn: async () => {
      const { data } = await supabase
        .from('transaction_items')
        .select(`
          quantity,
          subtotal,
          products(brand)
        `);

      const brandSales = data?.reduce((acc: any, item) => {
        const brand = item.products?.brand || 'Unknown';
        if (!acc[brand]) {
          acc[brand] = { brand, quantity: 0, revenue: 0 };
        }
        acc[brand].quantity += item.quantity;
        acc[brand].revenue += Number(item.subtotal);
        return acc;
      }, {});

      return Object.values(brandSales || {});
    }
  });

  const COLORS = ['#22c55e', '#16a34a', '#15803d', '#166534', '#14532d'];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats?.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              From {stats?.totalTransactions} transactions
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bags Sold</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalBags}</div>
            <p className="text-xs text-muted-foreground">
              Across all products
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">
              Registered customers
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              In catalog
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sales by Brand</CardTitle>
            <CardDescription>Revenue distribution across fertilizer brands</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesByBrand || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="brand" />
                <YAxis />
                <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString()}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Brand Distribution</CardTitle>
            <CardDescription>Quantity sold by brand</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={salesByBrand || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ brand, percent }) => `${brand} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="quantity"
                >
                  {(salesByBrand || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Latest sales activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats?.recentTransactions.map((transaction: any) => (
              <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">{transaction.customers?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Invoice: {transaction.invoice_number}
                  </p>
                  <div className="flex gap-2 mt-2">
                    {transaction.transaction_items?.slice(0, 2).map((item: any, idx: number) => (
                      <Badge key={idx} variant="secondary">
                        {item.products?.name} ({item.quantity})
                      </Badge>
                    ))}
                    {transaction.transaction_items?.length > 2 && (
                      <Badge variant="outline">
                        +{transaction.transaction_items.length - 2} more
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">₹{Number(transaction.total_amount).toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">{transaction.total_bags} bags</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
