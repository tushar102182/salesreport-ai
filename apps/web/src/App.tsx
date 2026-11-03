import { lazy, Suspense } from 'react';
import { BrowserRouter, Link, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from './lib/auth';
import { AppLayout } from './components/layout/AppLayout';
import { Button, FullPageSpinner } from './components/ui';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';

const LandingPage = lazy(() => import('./features/landing/LandingPage').then((m) => ({ default: m.LandingPage })));

const DashboardPage = lazy(() =>
  import('./features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const UploadPage = lazy(() => import('./features/datasets/UploadPage').then((m) => ({ default: m.UploadPage })));
const DatasetsPage = lazy(() => import('./features/datasets/DatasetsPage').then((m) => ({ default: m.DatasetsPage })));
const DatasetDetailPage = lazy(() =>
  import('./features/datasets/DatasetDetailPage').then((m) => ({ default: m.DatasetDetailPage })),
);
const InvoicesPage = lazy(() => import('./features/invoices/InvoicesPage').then((m) => ({ default: m.InvoicesPage })));
const InvoiceFormPage = lazy(() =>
  import('./features/invoices/InvoiceFormPage').then((m) => ({ default: m.InvoiceFormPage })),
);
const InvoiceDetailPage = lazy(() =>
  import('./features/invoices/InvoiceDetailPage').then((m) => ({ default: m.InvoiceDetailPage })),
);
const CustomersPage = lazy(() =>
  import('./features/customers/CustomersPage').then((m) => ({ default: m.CustomersPage })),
);
const ProductsPage = lazy(() => import('./features/products/ProductsPage').then((m) => ({ default: m.ProductsPage })));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })));

function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <FullPageSpinner />;
  if (status === 'anonymous')
    return location.pathname === '/' ? (
      <Navigate to="/welcome" replace />
    ) : (
      <Navigate to="/login" replace state={{ from: location.pathname }} />
    );
  return <Outlet />;
}

function GuestOnly() {
  const { status } = useAuth();
  if (status === 'loading') return <FullPageSpinner />;
  if (status === 'authenticated') return <Navigate to="/" replace />;
  return <Outlet />;
}

function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-6xl font-extrabold text-brand-600">404</p>
      <h1 className="mt-4 text-xl font-semibold">{t('errors.notFound')}</h1>
      <p className="mt-1 text-sm text-slate-500">{t('errors.notFoundHint')}</p>
      <Link to="/" className="mt-6">
        <Button>{t('errors.goHome')}</Button>
      </Link>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<FullPageSpinner />}>
        <Routes>
          <Route path="/welcome" element={<LandingPage />} />
          <Route element={<GuestOnly />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>
          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="upload" element={<UploadPage />} />
              <Route path="datasets" element={<DatasetsPage />} />
              <Route path="datasets/:id" element={<DatasetDetailPage />} />
              <Route path="invoices" element={<InvoicesPage />} />
              <Route path="invoices/new" element={<InvoiceFormPage />} />
              <Route path="invoices/:id" element={<InvoiceDetailPage />} />
              <Route path="invoices/:id/edit" element={<InvoiceFormPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="settings/:tab" element={<SettingsPage />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
