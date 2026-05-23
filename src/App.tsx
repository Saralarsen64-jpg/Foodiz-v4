import { Routes, Route, Navigate } from "react-router-dom";
import { FoodizPlusProvider } from "./context/FoodizPlusContext";
import { OrderProvider } from "./context/OrderContext";

// Layouts
import ClientLayout from "./components/ClientLayout";

// Client Pages
import ClientHome from "./pages/client/Home";
import RestaurantsPage from "./pages/client/Restaurants";
import MarketPage from "./pages/client/Market";
import EstablishmentPage from "./pages/client/Establishment";
import CartPage from "./pages/client/Cart";
import CheckoutPage from "./pages/client/Checkout";
import OrdersPage from "./pages/client/Orders";
import OrderDetailPage from "./pages/client/OrderDetail";
import OrderReviewPage from "./pages/client/OrderReview";
import AccountPage from "./pages/client/Account";
import PersonalInfoPage from "./pages/client/PersonalInfo";
import AddressesPage from "./pages/client/Addresses";
import PaymentsPage from "./pages/client/Payments";
import FavoritesPage from "./pages/client/Favorites";
import HelpPage from "./pages/client/Help";
import HelpCenterPage from "./pages/client/HelpCenter";
import DeleteAccountPage from "./pages/client/DeleteAccount";
import AdvantagesPage from "./pages/client/Advantages";
import ReferralPage from "./pages/client/Referral";
import SearchPage from "./pages/client/Search";
import NotificationsPage from "./pages/client/Notifications";
import OrderTrackingPage from "./pages/client/OrderTracking";

// Partner Pages
import PartnerDashboard from "./pages/partner/Dashboard";
import PartnerOrdersCurrent from "./pages/partner/OrdersCurrent";
import PartnerOrdersHistory from "./pages/partner/OrdersHistory";
import PartnerOrderDetail from "./pages/partner/OrderDetailPartner";
import PartnerRevenues from "./pages/partner/Revenues";
import PartnerMenu from "./pages/partner/Menu";
import PartnerProducts from "./pages/partner/Products";
import ProductEditPage from "./pages/partner/ProductEdit";
import PartnerPayouts from "./pages/partner/Payouts";
import PartnerSettings from "./pages/partner/Settings";
import PartnerAnalytics from "./pages/partner/Analytics";
import MarketingDashboard from "./pages/partner/MarketingDashboard";
import MarketingPacks from "./pages/partner/MarketingPacks";
import MarketingCheckout from "./pages/partner/MarketingCheckout";
import MarketingSubscription from "./pages/partner/MarketingSubscription";
import CreateCampaign from "./pages/partner/CreateCampaign";
import CampaignDetail from "./pages/partner/CampaignDetail";

// Courier Pages
import CourierDashboard from "./pages/courier/Dashboard";
import DeliveriesAvailable from "./pages/courier/DeliveriesAvailable";
import DeliveryCurrent from "./pages/courier/DeliveryCurrent";
import DeliveryTrackingPage from "./pages/courier/DeliveryTracking";

// Auth Pages
import RoleSelectPage from "./pages/auth/RoleSelect";
import LoginPage from "./pages/auth/Login";
import SignupPage from "./pages/auth/Signup";

// Admin Pages
import AdminEconomics from "./pages/admin/Economics";
import AdminPayouts from "./pages/admin/Payouts";
import AdminFoodizStats from "./pages/admin/FoodizStats";
import UserApprovals from "./pages/admin/UserApprovals";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminAuth from "./pages/admin/AdminAuth";

export default function App() {
  return (
    <OrderProvider>
      <FoodizPlusProvider>
        <Routes>
        {/* Redirect root */}
        <Route path="/" element={<Navigate to="/auth" replace />} />

        {/* ─── AUTH ROUTES ─────────────────────────────────────────── */}
        <Route path="/auth" element={<RoleSelectPage />} />
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/signup" element={<SignupPage />} />

        {/* ─── CLIENT ROUTES ───────────────────────────────────────── */}
        <Route element={<ClientLayout />}>
          <Route path="/client" element={<ClientHome />} />
          <Route path="/client/restaurants" element={<RestaurantsPage />} />
          <Route path="/client/market" element={<MarketPage />} />
          <Route path="/client/search" element={<SearchPage />} />
          <Route path="/client/establishments/:id" element={<EstablishmentPage />} />
          <Route path="/client/cart" element={<CartPage />} />
          <Route path="/client/checkout" element={<CheckoutPage />} />
          <Route path="/client/orders" element={<OrdersPage />} />
          <Route path="/client/orders/:id" element={<OrderDetailPage />} />
          <Route path="/client/orders/:id/review" element={<OrderReviewPage />} />
          <Route path="/client/orders/:id/tracking" element={<OrderTrackingPage />} />
          <Route path="/client/account" element={<AccountPage />} />
          <Route path="/client/account/personal-info" element={<PersonalInfoPage />} />
          <Route path="/client/account/addresses" element={<AddressesPage />} />
          <Route path="/client/account/payments" element={<PaymentsPage />} />
          <Route path="/client/account/favorites" element={<FavoritesPage />} />
          <Route path="/client/account/help" element={<HelpPage />} />
          <Route path="/client/account/delete" element={<DeleteAccountPage />} />
          <Route path="/client/account/referral" element={<ReferralPage />} />
          <Route path="/client/account/notifications" element={<NotificationsPage />} />
          <Route path="/client/help-center" element={<HelpCenterPage />} />
          <Route path="/client/advantages" element={<AdvantagesPage />} />
          <Route path="/client/advantages/history" element={<AdvantagesPage />} />
        </Route>

        {/* ─── PARTNER ROUTES ──────────────────────────────────────── */}
        <Route path="/partner" element={<PartnerDashboard />} />
        <Route path="/partner/orders/current" element={<PartnerOrdersCurrent />} />
        <Route path="/partner/orders/history" element={<PartnerOrdersHistory />} />
        <Route path="/partner/orders/:id" element={<PartnerOrderDetail />} />
        <Route path="/partner/revenues" element={<PartnerRevenues />} />
        <Route path="/partner/payouts" element={<PartnerPayouts />} />
        <Route path="/partner/menu" element={<PartnerMenu />} />
        <Route path="/partner/products" element={<PartnerProducts />} />
        <Route path="/partner/products/new" element={<ProductEditPage />} />
        <Route path="/partner/products/:id/edit" element={<ProductEditPage />} />
        <Route path="/partner/settings" element={<PartnerSettings />} />
        <Route path="/partner/analytics" element={<PartnerAnalytics />} />
        
        {/* Foodiz+ Marketing Routes */}
        <Route path="/partner/marketing" element={<MarketingDashboard />} />
        <Route path="/partner/marketing/packs" element={<MarketingPacks />} />
        <Route path="/partner/marketing/checkout" element={<MarketingCheckout />} />
        <Route path="/partner/marketing/subscription" element={<MarketingSubscription />} />
        <Route path="/partner/marketing/create-campaign" element={<CreateCampaign />} />
        <Route path="/partner/marketing/campaigns/:id" element={<CampaignDetail />} />

        {/* ─── COURIER ROUTES ──────────────────────────────────────── */}
        <Route path="/courier" element={<CourierDashboard />} />
        <Route path="/courier/deliveries/available" element={<DeliveriesAvailable />} />
        <Route path="/courier/deliveries/current" element={<DeliveryCurrent />} />
        <Route path="/courier/deliveries/:id" element={<DeliveryCurrent />} />
        <Route path="/courier/deliveries/:id/tracking" element={<DeliveryTrackingPage />} />

        {/* ─── ADMIN ROUTES ────────────────────────────────────────── */}
        <Route path="/fz-secure-admin-portal-8821" element={<AdminLogin />} />
        <Route path="/admin-auth" element={<AdminAuth />} />
        <Route path="/admin" element={<AdminEconomics />} />
        <Route path="/admin/economics" element={<AdminEconomics />} />
        <Route path="/admin/payouts" element={<AdminPayouts />} />
        <Route path="/admin/foodiz-stats" element={<AdminFoodizStats />} />
        <Route path="/admin/approvals" element={<UserApprovals />} />

        {/* ─── Catch all ───────────────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/client" replace />} />
        </Routes>
      </FoodizPlusProvider>
    </OrderProvider>
  );
}
