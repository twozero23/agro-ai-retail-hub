
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Minus, ShoppingCart } from 'lucide-react';

interface CartItem {
  productId: string;
  name: string;
  brand: string;
  price: number;
  quantity: number;
}

const TransactionForm = () => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [merchantId, setMerchantId] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*');
      if (error) throw error;
      return data;
    }
  });

  const createTransaction = useMutation({
    mutationFn: async (transactionData: any) => {
      // First, create or get customer
      let customerId;
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('phone_number', customerPhone)
        .single();

      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        const { data: newCustomer, error } = await supabase
          .from('customers')
          .insert({ name: customerName, phone_number: customerPhone })
          .select('id')
          .single();
        
        if (error) throw error;
        customerId = newCustomer.id;
      }

      // Create transaction
      const invoiceNumber = `INV-${Date.now()}`;
      const totalBags = cart.reduce((sum, item) => sum + item.quantity, 0);
      const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          customer_id: customerId,
          invoice_number: invoiceNumber,
          merchant_id: merchantId,
          total_bags: totalBags,
          total_amount: totalAmount,
          created_by: user?.id
        })
        .select('id')
        .single();

      if (transactionError) throw transactionError;

      // Create transaction items
      const items = cart.map(item => ({
        transaction_id: transaction.id,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.price,
        subtotal: item.price * item.quantity
      }));

      const { error: itemsError } = await supabase
        .from('transaction_items')
        .insert(items);

      if (itemsError) throw itemsError;

      return transaction;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Transaction recorded successfully!",
      });
      // Reset form
      setCustomerName('');
      setCustomerPhone('');
      setMerchantId('');
      setCart([]);
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to record transaction",
        variant: "destructive",
      });
      console.error('Transaction error:', error);
    }
  });

  const addToCart = () => {
    if (!selectedProduct) return;
    
    const product = products?.find(p => p.id === selectedProduct);
    if (!product) return;

    const existingItem = cart.find(item => item.productId === selectedProduct);
    if (existingItem) {
      setCart(cart.map(item => 
        item.productId === selectedProduct 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        productId: product.id,
        name: product.name,
        brand: product.brand,
        price: Number(product.price_per_bag),
        quantity: 1
      }]);
    }
    setSelectedProduct('');
  };

  const updateQuantity = (productId: string, change: number) => {
    setCart(cart.map(item => {
      if (item.productId === productId) {
        const newQuantity = item.quantity + change;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalBags = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      toast({
        title: "Error",
        description: "Please add products to cart",
        variant: "destructive",
      });
      return;
    }
    createTransaction.mutate({});
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>New Transaction</CardTitle>
          <CardDescription>Record a new fertilizer purchase</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="customerName">Customer Name</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerPhone">Phone Number</Label>
                <Input
                  id="customerPhone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="merchantId">Merchant ID</Label>
                <Input
                  id="merchantId"
                  value={merchantId}
                  onChange={(e) => setMerchantId(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label>Add Products</Label>
              <div className="flex gap-2">
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products?.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} - {product.brand} (₹{product.price_per_bag})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" onClick={addToCart} disabled={!selectedProduct}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </div>

            {cart.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Cart ({cart.length} items)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div key={item.productId} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">{item.brand}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.productId, -1)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Badge variant="secondary">{item.quantity}</Badge>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.productId, 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <div className="text-right min-w-[80px]">
                            <p className="font-medium">₹{(item.price * item.quantity).toLocaleString()}</p>
                            <p className="text-sm text-muted-foreground">₹{item.price}/bag</p>
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removeFromCart(item.productId)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-lg font-semibold">Total: ₹{totalAmount.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">{totalBags} bags</p>
                      </div>
                      <Button type="submit" size="lg" disabled={createTransaction.isPending}>
                        {createTransaction.isPending ? 'Processing...' : 'Complete Transaction'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionForm;
