import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, role: requiredRole }) => {
  const { authToken, role: contextRole } = useAuth();

  // Fallback to storage if context is empty
  const token = authToken || localStorage.getItem('token') || sessionStorage.getItem('token');
  const role = contextRole || localStorage.getItem('role') || sessionStorage.getItem('role');

  if (!token) {
    return <Navigate to="/" />;
  }

  if (requiredRole) {
    const r = (role || '').toLowerCase();
    const req = requiredRole.toLowerCase();
    // Role alias mapping: leaders can access CRE-CRM routes
    const roleAliases = {
      'cre-crm': new Set(['cre-crm', 'crm-teamlead', 'regionalhead', 'nationalhead']),
    };
    const allowed = roleAliases[req];
    const ok = allowed ? allowed.has(r) : r === req;
    if (!ok) return <Navigate to="/" />;
  }

  return children;
};

export default ProtectedRoute;
