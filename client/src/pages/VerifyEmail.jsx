import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../services/api';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('No verification token found in this link.');
      return;
    }
    api.get('/auth/verify-email', { params: { token } })
      .then(res => {
        setMessage(res.data.message);
        setStatus('success');
      })
      .catch(err => {
        setMessage(err.response?.data?.message || 'Verification failed. The link may have expired.');
        setStatus('error');
      });
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-indigo-100 px-4">
      <div className="w-full max-w-md">
        <div className="card text-center py-10 px-8">
          {status === 'loading' && (
            <>
              <div className="animate-spin h-12 w-12 border-4 border-primary-600 border-t-transparent rounded-full mx-auto mb-6" />
              <p className="text-gray-600">Verifying your email…</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Verified!</h2>
              <p className="text-gray-500 mb-8">{message}</p>
              <Link to="/login" className="btn-primary inline-block px-8 py-2.5">
                Go to Login
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h2>
              <p className="text-gray-500 mb-8">{message}</p>
              <Link to="/register" className="btn-primary inline-block px-8 py-2.5">
                Register Again
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
