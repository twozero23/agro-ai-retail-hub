
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Phone, Calendar, ShoppingBag } from 'lucide-react';

const CustomerList = () => {
  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers-with-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          transactions(
            id,
            total_amount,
            total_bags,
            created_at
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return <div className="text-center py-8">Loading customers...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Customers</h2>
        <p className="text-muted-foreground">Manage customer information and purchase history</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {customers?.map((customer) => {
          const totalPurchases = customer.transactions?.length || 0;
          const totalSpent = customer.transactions?.reduce((sum: number, t: any) => sum + Number(t.total_amount), 0) || 0;
          const totalBags = customer.transactions?.reduce((sum: number, t: any) => sum + t.total_bags, 0) || 0;
          const lastPurchase = customer.transactions?.[0]?.created_at;

          return (
            <Card key={customer.id}>
              <CardHeader>
                <CardTitle className="text-lg">{customer.name}</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  {customer.phone_number}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Spent</span>
                    <Badge variant="secondary" className="font-bold">
                      ₹{totalSpent.toLocaleString()}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Purchases</span>
                    <Badge variant="outline">
                      {totalPurchases} transactions
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Bags</span>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <ShoppingBag className="h-3 w-3" />
                      {totalBags}
                    </Badge>
                  </div>
                  
                  {lastPurchase && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Last Purchase</span>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(lastPurchase).toLocaleDateString()}
                      </Badge>
                    </div>
                  )}
                  
                  {totalPurchases === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-2">
                      No purchases yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {customers?.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No customers found. They will appear here after their first purchase.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CustomerList;
