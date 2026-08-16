import { Navigate, Route, Routes } from 'react-router'
import PrivateLayout from '../layouts/PrivateLayout'
import Analysis from '../pages/Analysis'
import Dashboard from '../pages/Dashboard'
import ForgotPassword from '../pages/ForgotPassword'
import Login from '../pages/Signin'
import Model from '../pages/Model'
import Monitoring from '../pages/Monitoring'
import NotFound from '../pages/NotFound'
import Register from '../pages/Register'
import Settings from '../pages/Settings'
import ProtectedRoute from './ProtectedRoute'
import PublicRoute from './PublicRoute'
import { PATHS } from './paths'

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route element={<PublicRoute />}>
        <Route path={PATHS.signin} element={<Login />} />
        <Route path={PATHS.register} element={<Register />} />
        <Route path={PATHS.forgotPassword} element={<ForgotPassword />} />
      </Route>

      {/* Protected */}
      <Route element={<ProtectedRoute />}>
        <Route element={<PrivateLayout />}>
          <Route path={PATHS.dashboard} element={<Dashboard />} />
          <Route path={PATHS.monitoring} element={<Monitoring />} />
          <Route path={PATHS.analysis} element={<Analysis />} />
          <Route path={PATHS.model} element={<Model />} />
          <Route path={PATHS.settings} element={<Settings />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to={PATHS.dashboard} replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default AppRoutes
