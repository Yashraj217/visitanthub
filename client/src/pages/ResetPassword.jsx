import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Password reset is now handled via OTP in ForgotPassword
export default function ResetPassword() {
  const navigate = useNavigate();
  useEffect(() => { navigate('/forgot-password', { replace: true }); }, []);
  return null;
}
