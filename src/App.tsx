import { Routes, Route, Navigate } from "react-router-dom";
import AdminAuth from "./pages/AdminAuth";

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
import NotificationsPage from "./pages/client/Notifications";
import DeleteAccountPage from "./pages/client/DeleteAccount";
import AdvantagesPage from "./pages/client/Advantages";
import ReferralPage from "./pages/client/Referral";

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
import PartnerCustomers from "./pages/partner/Customers";
import PartnerMarketing from "./pages/partner/Marketing";
import PartnerOnboarding from "./pages/partner/Onboarding";
import PartnerValidationStatus from "./pages/partner/ValidationStatus";
import PartnerSupport from "./pages/partner/Support";
import PartnerSettings from "./pages/partner/Settings";

// Courier Pages
import CourierDashboard from "./pages/courier/Dashboard";
import DeliveriesAvailable from "./pages/courier/DeliveriesAvailable";
import DeliveryCurrent from "./pages/courier/DeliveryCurrent";
import DeliveriesHistoryPage from "./pages/courier/DeliveriesHistory";
import CourierRevenuesPage from "./pages/courier/Revenues";
import CourierPayoutsPage from "./pages/courier/Payouts";
import CourierProfilePage from "./pages/courier/Profile";
import CourierSupportPage from "./pages/courier/Support";
import CourierHelpCenterPage from "./pages/courier/HelpCenter";
import CourierOnboardingPage from "./pages/courier/Onboarding";
import CourierValidationStatusPage from "./pages/courier/ValidationStatus";

// Auth Pages
import RoleSelectPage from "./pages/auth/RoleSelect";
import LoginPage from "./pages/auth/Login";
import SignupPage from "./pages/auth/Signup";

// Admin Pages
import AdminDashboardPage from "./pages/admin/Dashboard";
import AdminEconomics from "./pages/admin/Economics";
import AdminPayouts from "./pages/admin/Payouts";
import AdminSupportPage from "./pages/admin/Support";
import AdminSubscriptionsPage from "./pages/admin/Subscriptions";
import AdminPartnerApplicationsPage from "./pages/admin/PartnerApplications";
import AdminCourierApplicationsPage from "./pages/admin/CourierApplications";
import AdminMarketingCampaignsPage from "./pages/admin/MarketingCampaigns";

export default function App() {
  return (
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
        <Route path="/client/search" element={<ClientHome />} />
        <Route path="/client/establishments/:id" element={<EstablishmentPage />} />
        <Route path="/client/cart" element={<CartPage />} />
        <Route path="/client/checkout" element={<CheckoutPage />} />
        <Route path="/client/orders" element={<OrdersPage />} />
        <Route path="/client/orders/:id" element={<OrderDetailPage />} />
        <Route path="/client/orders/:id/review" element={<OrderReviewPage />} />
        <Route path="/client/account" element={<AccountPage />} />
        <Route path="/client/account/personal-info" element={<PersonalInfoPage />} />
        <Route path="/client/account/addresses" element={<AddressesPage />} />
        <Route path="/client/account/payments" element={<PaymentsPage />} />
        <Route path="/client/account/favorites" element={<FavoritesPage />} />
        <Route path="/client/account/help" element={<HelpPage />} />
        <Route path="/client/account/notifications" element={<NotificationsPage />} />
        <Route path="/client/account/delete" element={<DeleteAccountPage />} />
        <Route path="/client/account/referral" element={<ReferralPage />} />
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
      <Route path="/partner/customers" element={<PartnerCustomers />} />
      <Route path="/partner/marketing" element={<PartnerMarketing />} />
      <Route path="/partner/onboarding" element={<PartnerOnboarding />} />
      <Route path="/partner/validation-status" element={<PartnerValidationStatus />} />
      <Route path="/partner/support" element={<PartnerSupport />} />
      <Route path="/partner/menu" element={<PartnerMenu />} />
      <Route path="/partner/products" element={<PartnerProducts />} />
      <Route path="/partner/products/new" element={<ProductEditPage />} />
      <Route path="/partner/products/:id/edit" element={<ProductEditPage />} />
      <Route path="/partner/settings" element={<PartnerSettings />} />

      {/* ─── COURIER ROUTES ──────────────────────────────────────── */}
      <Route path="/courier" element={<CourierDashboard />} />
      <Route path="/courier/deliveries/available" element={<DeliveriesAvailable />} />
      <Route path="/courier/deliveries/current" element={<DeliveryCurrent />} />
      <Route path="/courier/deliveries/history" element={<DeliveriesHistoryPage />} />
      <Route path="/courier/deliveries/:id" element={<DeliveryCurrent />} />
      <Route path="/courier/revenues" element={<CourierRevenuesPage />} />
      <Route path="/courier/payouts" element={<CourierPayoutsPage />} />
      <Route path="/courier/profile" element={<CourierProfilePage />} />
      <Route path="/courier/support" element={<CourierSupportPage />} />
      <Route path="/courier/help-center" element={<CourierHelpCenterPage />} />
      <Route path="/courier/onboarding" element={<CourierOnboardingPage />} />
      <Route path="/courier/validation-status" element={<CourierValidationStatusPage />} />

      {/* ─── ADMIN ROUTES ────────────────────────────────────────── */}
      <Route path="/admin/auth" element={<AdminAuth />} />
      <Route path="/admin" element={<AdminDashboardPage />} />
      <Route path="/admin/economics" element={<AdminEconomics />} />
      <Route path="/admin/payouts" element={<AdminPayouts />} />
      <Route path="/admin/support" element={<AdminSupportPage />} />
      <Route path="/admin/subscriptions" element={<AdminSubscriptionsPage />} />
      <Route path="/admin/partner-applications" element={<AdminPartnerApplicationsPage />} />
      <Route path="/admin/courier-applications" element={<AdminCourierApplicationsPage />} />
      <Route path="/admin/marketing-campaigns" element={<AdminMarketingCampaignsPage />} />

      {/* ─── Catch all ───────────────────────────────────────────── */}
      <Route path="*" element={<Navigate to="/client" replace />} />
    </Routes>
  );
}
