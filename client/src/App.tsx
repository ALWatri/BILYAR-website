import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/lib/cart";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Shop from "@/pages/Shop";
import ProductDetails from "@/pages/ProductDetails";
import Checkout from "@/pages/Checkout";
import OrderSuccess from "@/pages/OrderSuccess";
import OrderFailed from "@/pages/OrderFailed";
import { About, Contact } from "@/pages/StaticPages";
import Login from "@/pages/admin/Login";
import Dashboard from "@/pages/admin/Dashboard";
import Orders from "@/pages/admin/Orders";
import Products from "@/pages/admin/Products";
import Customers from "@/pages/admin/Customers";
import Settings from "@/pages/admin/Settings";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home}/>
      <Route path="/shop" component={Shop}/>
      <Route path="/product/:id" component={ProductDetails}/>
      <Route path="/checkout" component={Checkout}/>
      <Route path="/order/success" component={OrderSuccess}/>
      <Route path="/order/failed" component={OrderFailed}/>
      <Route path="/about" component={About}/>
      <Route path="/contact" component={Contact}/>
      <Route path="/collections" component={Shop}/> 
      
      {/* Admin Routes */}
      <Route path="/admin/login" component={Login}/>
      <Route path="/admin" component={Dashboard}/>
      <Route path="/admin/orders" component={Orders}/>
      <Route path="/admin/products" component={Products}/>
      <Route path="/admin/customers" component={Customers}/>
      <Route path="/admin/settings" component={Settings}/>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CartProvider>
          <Toaster />
          <Router />
        </CartProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
