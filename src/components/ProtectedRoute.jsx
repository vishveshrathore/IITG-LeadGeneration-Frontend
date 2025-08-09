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

  if (requiredRole && role?.toLowerCase() !== requiredRole.toLowerCase()) {
    return <Navigate to="/" />;
  }

  return children;
};

export default ProtectedRoute;
