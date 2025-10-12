import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, role: requiredRole, roles: requiredRoles }) => {
  const { authToken, role: contextRole } = useAuth();

  // Fallback to storage if context is empty
  const token = authToken || localStorage.getItem('token') || sessionStorage.getItem('token');
  const role = (contextRole || localStorage.getItem('role') || sessionStorage.getItem('role') || '').toLowerCase();
  const roleNorm = role.replace(/[^a-z]/g, '');

  if (!token) {
    return <Navigate to="/" />;
  }

  // Normalize helpers
  const norm = (v) => String(v || '').toLowerCase();
  const normKey = (v) => norm(v).replace(/[^a-z]/g, '');

  // Aliases: leaders can access CRE-CRM surfaces
  const aliasSets = {
    // use normalized keys and members
    'crecrm': new Set(['crecrm', 'crmteamlead', 'deputycrmteamlead', 'regionalhead', 'deputyregionalhead', 'nationalhead', 'deputynationalhead'])
  };

  const isAllowed = () => {
    if (requiredRoles && Array.isArray(requiredRoles) && requiredRoles.length) {
      // If any required role matches (including alias), allow
      return requiredRoles.some((rr) => {
        const rreqN = normKey(rr);
        const alias = aliasSets[rreqN];
        return alias ? alias.has(roleNorm) : roleNorm === rreqN;
      });
    }

    if (requiredRole) {
      const rreqN = normKey(requiredRole);
      const alias = aliasSets[rreqN];
      return alias ? alias.has(roleNorm) : roleNorm === rreqN;
    }

    return true; // no role restriction
  };

  if (!isAllowed()) return <Navigate to="/" />;

  return children;
};

export default ProtectedRoute;
