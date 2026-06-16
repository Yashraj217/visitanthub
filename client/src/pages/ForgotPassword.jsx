import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep]     = useState('email'); // 'email' | 'otp'
  const [email, setEmail]   = useState('');
  const [otp, setOtp]       = useState(['', '', '', '', '']);
  const [form, setForm]     = useState({ new_password: '', confirm_password: '' });
  const [loading, setLoading] = useState(false);
  const inputs = useRef([]);

  function handleOtpChange(i, val) {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[i] = val.slice(-1);
    setOtp(next);
    if (val && i < 4) inputs.current[i + 1]?.focus();
  }

  function handleOtpKey(i, e) {
    if (e.key === 'Backspace' && !otp[i] && i > 0) inputs.current[i - 1]?.focus();
  }

  function handleOtpPaste(e) {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 5).split('');
    if (!digits.length) return;
    const next = [...otp];
    digits.forEach((d, i) => { next[i] = d; });
    setOtp(next);
    inputs.current[Math.min(digits.length, 4)]?.focus();
  }

  async function handleSendOtp(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setStep('otp');
      toast.success('Code sent — check your email');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 5) return toast.error('Please enter the complete 5-digit code');
    if (form.new_password !== form.confirm_password) return toast.error('Passwords do not match');
    if (form.new_password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, otp: code, new_password: form.new_password });
      toast.success('Password reset successfully!');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-indigo-100 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
            <span className="text-3xl">{step === 'email' ? '🔑' : '📧'}</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            {step === 'email' ? 'Forgot Password' : 'Enter Reset Code'}
          </h2>
          <p className="text-gray-500 mt-2 text-sm">
            {step === 'email'
              ? 'Enter your email and we\'ll send you a reset code'
              : <>Code sent to <strong>{email}</strong></>}
          </p>
        </div>

        <div className="card">
          {step === 'email' ? (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div>
                <label className="label">Email address</label>
                <input type="email" required className="input"
                  placeholder="you@example.com"
                  value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
                {loading ? 'Sending…' : 'Send Reset Code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleReset} className="space-y-5">
              {/* OTP boxes */}
              <div>
                <label className="label text-center block">5-digit code</label>
                <div className="flex gap-3 justify-center mt-2" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => inputs.current[i] = el}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKey(i, e)}
                      className="w-12 h-14 text-center text-2xl font-bold border-2 rounded-xl focus:outline-none focus:border-primary-500 transition-colors"
                      style={{ borderColor: digit ? '#6366f1' : '#e5e7eb' }}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-400 text-center mt-2">
                  Expires in 15 minutes ·{' '}
                  <button type="button" className="text-primary-600 hover:underline"
                    onClick={() => { setStep('email'); setOtp(['','','','','']); }}>
                    Resend
                  </button>
                </p>
              </div>

              <div>
                <label className="label">New Password</label>
                <input type="password" required className="input"
                  placeholder="Min 6 characters"
                  value={form.new_password}
                  onChange={e => setForm(f => ({ ...f, new_password: e.target.value }))} />
              </div>
              <div>
                <label className="label">Confirm New Password</label>
                <input type="password" required className="input"
                  placeholder="Repeat new password"
                  value={form.confirm_password}
                  onChange={e => setForm(f => ({ ...f, confirm_password: e.target.value }))} />
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
                {loading ? 'Resetting…' : 'Reset Password'}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-gray-500 mt-6">
            <Link to="/login" className="text-primary-600 font-medium hover:underline">← Back to Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
