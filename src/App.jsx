import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import Layout from '@/components/Layout';
import Home from '@/pages/Home';
import CreditOrder from '@/pages/CreditOrder';
import Market from '@/pages/Market';
import OrderDetail from '@/pages/OrderDetail';
import MyOrders from '@/pages/MyOrders';
import Trades from '@/pages/Trades';
import TradeDetail from '@/pages/TradeDetail';
import SmartContract from '@/pages/SmartContract';
import Store from '@/pages/Store';
import ProductDetail from '@/pages/ProductDetail';
import Transactions from '@/pages/Transactions';
import Notifications from '@/pages/Notifications';
import Support from '@/pages/Support';
import Account from '@/pages/Account';
import Admin from '@/pages/Admin';
import Rewards from '@/pages/Rewards';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/sell" element={<CreditOrder side="sell" />} />
        <Route path="/buy" element={<CreditOrder side="buy" />} />
        <Route path="/market" element={<Market />} />
        <Route path="/market/:id" element={<OrderDetail />} />
        <Route path="/my-orders" element={<MyOrders />} />
        <Route path="/trades" element={<Trades />} />
        <Route path="/trades/:id" element={<TradeDetail />} />
        <Route path="/smart-contract" element={<SmartContract />} />
        <Route path="/store" element={<Store />} />
        <Route path="/store/:id" element={<ProductDetail />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/support" element={<Support />} />
        <Route path="/account" element={<Account />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/rewards" element={<Rewards />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App