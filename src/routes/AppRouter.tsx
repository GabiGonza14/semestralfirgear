import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { SiteLayout } from '../layouts/SiteLayout'
import { AccountPage } from '../pages/AccountPage'
import { AdminDashboardPage } from '../pages/AdminDashboardPage'
import { CartPage } from '../pages/CartPage'
import { CheckoutCancelPage } from '../pages/CheckoutCancelPage'
import { CheckoutSuccessPage } from '../pages/CheckoutSuccessPage'
import { LandingPage } from '../pages/LandingPage'
import { LoginPage } from '../pages/LoginPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { OrdersPage } from '../pages/OrdersPage'
import { ProductDetailPage } from '../pages/ProductDetailPage'
import { ShopPage } from '../pages/ShopPage'
import { SignUpPage } from '../pages/SignUpPage'
import { SsoCallbackPage } from '../pages/SsoCallbackPage'
import { ProtectedRoute } from './ProtectedRoute'
import { CustomerRoute } from './CustomerRoute'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login/*" element={<LoginPage />} />
        <Route path="/sign-up/*" element={<SignUpPage />} />

        <Route element={<SiteLayout />}>
          <Route
            path="/"
            element={
              <CustomerRoute>
                <LandingPage />
              </CustomerRoute>
            }
          />
          <Route
            path="/shop"
            element={
              <CustomerRoute>
                <ShopPage />
              </CustomerRoute>
            }
          />
          <Route
            path="/product/:id"
            element={
              <CustomerRoute>
                <ProductDetailPage />
              </CustomerRoute>
            }
          />
          <Route
            path="/cart"
            element={
              <CustomerRoute>
                <CartPage />
              </CustomerRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <CustomerRoute>
                <ProtectedRoute>
                  <OrdersPage />
                </ProtectedRoute>
              </CustomerRoute>
            }
          />
          <Route
            path="/checkout/success"
            element={
              <CustomerRoute>
                <CheckoutSuccessPage />
              </CustomerRoute>
            }
          />
          <Route
            path="/checkout/cancel"
            element={
              <CustomerRoute>
                <CheckoutCancelPage />
              </CustomerRoute>
            }
          />
          <Route
            path="/account/*"
            element={
              <CustomerRoute>
                <ProtectedRoute>
                  <AccountPage />
                </ProtectedRoute>
              </CustomerRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route path="/sso-callback" element={<SsoCallbackPage />} />
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
