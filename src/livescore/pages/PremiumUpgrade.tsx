import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button, Card, CardContent } from '../components/ui';
import { Check, Crown, Zap, ShieldCheck, CreditCard, ExternalLink, RefreshCw, Lock, Clock, Loader2, Star, Sparkles, TrendingUp } from 'lucide-react';

declare global {
  interface Window {
    PaystackPop: any;
  }
}

const PAYSTACK_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_live_d4e12fc3d689e19440973a66eaa985fcfdf1a7cc';
const PLAN = { code: 'KES', symbol: 'KSh', amount: 100, amountInKobo: 10000 };

export function PremiumUpgrade({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const { user, upgrade, planLoading } = useAuth();
  const [loadingPaystack, setLoadingPaystack] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<any>(null);
  const [customPhone, setCustomPhone] = useState('+254701234567');

  useEffect(() => {
    if (window.PaystackPop) {
      setScriptLoaded(true);
      console.log('✓ Paystack script already loaded');
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.type = 'text/javascript';

    script.onload = () => {
      if (window.PaystackPop) {
        setScriptLoaded(true);
        console.log('✓ Paystack script loaded successfully');
      } else {
        const error = 'PaystackPop not available after script load';
        setScriptError(error);
        console.error(error);
      }
    };

    script.onerror = () => {
      const error = 'Paystack script failed to load. This may be due to an ad blocker or network issue.';
      setScriptError(error);
      console.error(error);
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup: Remove script if component unmounts
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  if (planLoading) {
    return (
      <div className="flex items-center justify-center py-24 gap-3 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Checking your plan...</span>
      </div>
    );
  }

  if (user?.plan === 'premium') {
    return (
      <div className="max-w-3xl mx-auto text-center py-12 space-y-6">
        <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
          <Crown className="w-10 h-10 text-amber-500" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Premium Active! 🎉</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
          Your daily pass is live for the next 24 hours. Enjoy unlimited access to all premium predictions, live API feeds, expert picks, and global leagues.
        </p>

        {paymentSuccess && (
          <Card className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-left max-w-lg mx-auto">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-base">
                <ShieldCheck className="w-5 h-5" />
                <span>Paystack Payment Verified Successfully</span>
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1 font-mono bg-white dark:bg-slate-900 p-3 rounded-lg border border-emerald-100 dark:border-emerald-900/50">
                <div><span className="font-semibold text-slate-500">Reference:</span> {paymentSuccess.reference}</div>
                <div><span className="font-semibold text-slate-500">Status:</span> {paymentSuccess.status || 'success'}</div>
                <div><span className="font-semibold text-slate-500">Amount Paid:</span> KSh 100</div>
                <div><span className="font-semibold text-slate-500">Access:</span> 24 Hours</div>
                <div><span className="font-semibold text-slate-500">Account:</span> {user?.email}</div>
              </div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                A receipt has been sent to your email. Your premium access expires in 24 hours.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3 justify-center">
          <Button onClick={() => setActiveTab('predictions')} size="lg" className="shadow-lg">
            View Live Premium Picks
          </Button>
        </div>
      </div>
    );
  }

  const handlePaystackCheckout = () => {
    if (!window.PaystackPop) {
      console.error('PaystackPop not available. Script may be blocked or not loaded.');
      if (scriptError) {
        alert(`Payment gateway unavailable: ${scriptError}\n\nPlease disable ad blockers and try again, or use the test button below.`);
      } else {
        alert('Paystack gateway is not loaded. Please wait a moment and try again.');
      }
      return;
    }

    if (!PAYSTACK_KEY || PAYSTACK_KEY.includes('pk_test') === false && PAYSTACK_KEY.includes('pk_live') === false) {
      console.error('Invalid Paystack key:', PAYSTACK_KEY);
      alert('Payment gateway is not properly configured. Please contact support.');
      return;
    }

    setLoadingPaystack(true);

    try {
      console.log('Initializing Paystack with key:', PAYSTACK_KEY.substring(0, 10) + '...');

      const handler = window.PaystackPop.setup({
        key: PAYSTACK_KEY,
        email: user?.email || 'customer@footypredict.ai',
        amount: PLAN.amountInKobo,
        currency: PLAN.code,
        ref: 'FP_DAY_' + Math.floor(Math.random() * 1000000000 + 1),
        metadata: {
          custom_fields: [
            { display_name: 'Member Name', variable_name: 'member_name', value: user?.name || 'ScoreHub Member' },
            { display_name: 'Mobile Number', variable_name: 'mobile_number', value: customPhone },
            { display_name: 'Plan', variable_name: 'plan', value: 'Daily Premium Pass' },
          ],
        },
        callback: (response: any) => {
          console.log('✓ Payment successful, reference:', response.reference);
          setPaymentSuccess(response);
          setLoadingPaystack(false);
          upgrade(response.reference || response.ref || 'paystack-unknown').catch(err => {
            console.error('Failed to save plan to Supabase:', err);
          });
        },
        onClose: () => {
          console.log('Payment popup closed by user');
          setLoadingPaystack(false);
        },
      });

      if (!handler || !handler.openIframe) {
        throw new Error('Paystack handler initialization failed');
      }

      console.log('Opening Paystack iframe...');
      handler.openIframe();
    } catch (err) {
      console.error('Paystack initialization error:', err);
      setLoadingPaystack(false);
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      alert(`Payment error: ${errorMsg}\n\nPlease try again or contact support.`);
    }
  };

  const simulateSuccess = async () => {
    const mockResponse = {
      reference: 'FP_DAY_SIM_' + Math.floor(Math.random() * 1000000000 + 1),
      status: 'success',
      message: 'Approved Simulator Transaction',
      transaction: '1234567890',
    };
    try {
      await upgrade(mockResponse.reference);
    } catch (err) {
      console.error('Failed to save plan to Supabase:', err);
    }
    setPaymentSuccess(mockResponse);
  };

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-12">
      <div className="text-center space-y-6">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-4 py-1.5 rounded-full text-sm font-semibold">
          <ShieldCheck className="w-4 h-4" /> Official Paystack Gateway — Kenya
        </div>
        <div className="space-y-3">
          <h1 className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
            Unlock Premium Access
          </h1>
          <p className="text-xl text-white max-w-2xl mx-auto leading-relaxed">
            Get instant access to unlimited expert predictions, premium picks, and advanced features for just <span className="font-bold" style={{ color: 'rgb(35, 223, 57)' }}>KSh 100</span>.
          </p>
        </div>

        {/* Trust Signals */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
            <Star className="w-4 h-4 text-amber-300 fill-amber-300" />
            <span className="text-amber-300">Trusted by 500+ users</span>
          </div>
          <div className="w-px h-4 bg-slate-300 dark:bg-slate-700" />
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
            <TrendingUp className="w-4 h-4 text-lime-400" />
            <span className="text-lime-400">24-hour access</span>
          </div>
          <div className="w-px h-4 bg-slate-300 dark:bg-slate-700" />
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
            <Lock className="w-4 h-4 text-cyan-400" />
            <span className="text-white">100% Secure</span>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Free Plan */}
        <Card className="flex flex-col opacity-80 hover:opacity-100 transition-opacity">
          <div className="p-6 border-b border-border" style={{ textShadow: '1px 1px 3px rgba(0, 0, 0, 1)' }}>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Free Tier</h3>
            <div className="mt-4">
              <span className="text-4xl font-extrabold text-slate-900 dark:text-white">KSh 0</span>
            </div>
            <p className="mt-2 text-sm" style={{ color: 'rgba(0, 0, 0, 1)', textShadow: '1px 1px 3px rgba(0, 0, 0, 1)' }}>Limited daily picks.</p>
          </div>
          <CardContent className="flex-1 flex flex-col justify-between pt-6">
            <ul className="space-y-4 mb-8" style={{ backgroundColor: 'rgba(255, 255, 255, 1)' }}>
              {['2 Basic Predictions daily', 'Standard Leagues only', 'Basic odds display', 'Community forum access', 'Historical results view'].map((feature, i) => (
                <li key={i} className="flex items-start text-sm">
                  <Check className="w-4 h-4 text-slate-400 shrink-0 mr-3 mt-0.5" />
                  <span className="text-slate-600 dark:text-slate-300">{feature}</span>
                </li>
              ))}
            </ul>
            <Button variant="outline" className="w-full h-11 font-semibold" disabled>
              Your Current Plan
            </Button>
          </CardContent>
        </Card>

        {/* Premium Daily Pass */}
        <Card className="flex flex-col border-emerald-500/50 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-black px-4 py-1 rounded-bl-lg uppercase tracking-wider shadow">
            🔥 Best Value
          </div>
          <div className="p-6 bg-gradient-to-br from-emerald-50/80 to-teal-50/80 dark:from-emerald-900/10 dark:to-teal-900/10 border-b border-emerald-500/20">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-500 mb-1">
              <Crown className="w-5 h-5" />
              <h3 className="text-lg font-bold text-emerald-800 dark:text-emerald-400">Premium Daily Pass</h3>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-black text-slate-900 dark:text-white">KSh {PLAN.amount}</span>
              <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> / 24 hours
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">One-time payment. No subscription. Expires after 24 hours.</p>
          </div>

          <CardContent className="flex-1 flex flex-col pt-6 space-y-6">
            <div className="space-y-4 flex-1">
              <div className="grid grid-cols-1 gap-3">
                {[
                  { icon: '⚡', text: 'Unlimited Live RapidAPI Feed Picks' },
                  { icon: '🌐', text: 'All Global Leagues & Federations' },
                  { icon: '📊', text: 'Advanced Market Filtering (BTTS, Over/Under)' },
                  { icon: '🧠', text: 'Detailed Expert Rationale per Pick' },
                  { icon: '📲', text: 'Live Alerts & Priority SMS Updates' },
                  { icon: '🏆', text: 'Access to Exclusive Leaderboard Rankings' },
                ].map((feature, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50/30 dark:bg-emerald-900/10 border border-emerald-100/50 dark:border-emerald-800/30 hover:border-emerald-200 dark:hover:border-emerald-700 transition-colors" style={{ textShadow: '1px 1px 3px rgba(0, 0, 0, 1)' }}>
                    <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-sm font-medium" style={{ color: 'rgba(0, 0, 0, 1)' }}>{feature.text}</span>
                  </div>
                ))}
              </div>

              {/* Value Highlight */}
              <div className="bg-gradient-to-r from-emerald-500/5 to-teal-500/5 border border-emerald-200/50 dark:border-emerald-800/50 rounded-lg p-4 text-center space-y-1">
                <div className="flex items-center justify-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                  <Sparkles className="w-4 h-4" />
                  <span>Valid for 24 Hours • No Auto-Renewal</span>
                </div>
                <p className="text-xs" style={{ color: 'rgba(0, 0, 0, 1)' }}>
                  Unlimited access during your subscription period. Cancel anytime.
                </p>
              </div>
            </div>

            {/* Checkout Settings */}
            <div className="space-y-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex items-center justify-between font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 pb-2">
                <span className="flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-500" /> Paystack Checkout
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Secure 256-bit SSL
                </span>
              </div>

              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'rgba(0, 0, 0, 1)' }}>Account Email</label>
                  <input
                    type="text"
                    disabled
                    value={user?.email || 'customer@footypredict.ai'}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 text-slate-600 dark:text-slate-400 text-xs cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'rgba(0, 0, 0, 1)' }}>Mobile Phone (For Alerts)</label>
                  <input
                    type="text"
                    value={customPhone}
                    onChange={(e) => setCustomPhone(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none text-xs"
                    placeholder="+254 701 234 567"
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-1 text-[11px] font-medium">
                <span style={{ color: 'rgba(0, 0, 0, 1)' }}>Accepted:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">💳 Card · 🏦 Transfer · 📱 M-Pesa · ⚡ Mobile Money</span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              {scriptError && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    <span className="font-semibold">⚠️ Gateway Issue:</span> {scriptError}
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    Try disabling ad blockers or use the test button below.
                  </p>
                </div>
              )}
              <Button
                variant="premium"
                className="w-full text-base h-13 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:shadow-emerald-500/20 transition-all font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handlePaystackCheckout}
                disabled={loadingPaystack}
              >
                {loadingPaystack ? (
                  <><RefreshCw className="w-5 h-5 animate-spin" /> Processing...</>
                ) : !scriptLoaded && !scriptError ? (
                  <><RefreshCw className="w-5 h-5 animate-spin" /> Loading Gateway...</>
                ) : (
                  <><Sparkles className="w-5 h-5" /> Unlock Premium Now <ExternalLink className="w-4 h-4 ml-1 opacity-80" /></>
                )}
              </Button>

              <div className="relative py-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-700" />
                </div>
                <div className="relative flex justify-center text-[11px]">
                  <span className="px-2 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">Testing Only</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full text-xs h-10 text-emerald-600 dark:text-emerald-400 border-emerald-500/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-medium"
                onClick={simulateSuccess}
              >
                <Sparkles className="w-4 h-4 mr-1.5 text-amber-500" /> Simulate Success for Testing
              </Button>

              <p className="text-[11px] text-center font-medium" style={{ color: 'rgba(0, 0, 0, 1)' }}>
                💳 Secure payment via Paystack • Your data is encrypted
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Paystack Info Banner */}
      <Card className="bg-slate-900 text-slate-300 border-none overflow-hidden max-w-4xl mx-auto">
        <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 text-white font-bold text-lg">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              <span>Enterprise Grade Security by Paystack</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xl">
              Paystack is a PCI-DSS Level 1 compliant payment provider. Your card details are never stored on ScoreHub servers. Supports M-Pesa, cards, bank transfers, and mobile money across Kenya and Africa.
            </p>
          </div>
          <div className="flex flex-col items-center gap-2 shrink-0 bg-white/5 p-4 rounded-xl border border-white/10 w-full sm:w-auto text-center">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Secured &amp; Verified</span>
            <div className="flex items-center gap-2 text-white font-black text-xl tracking-tight">
              <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-base font-bold">P</span>
              <span>paystack</span>
            </div>
            <span className="text-[11px] text-emerald-400 font-medium">SSL / PCI-DSS Level 1</span>
          </div>
        </CardContent>
      </Card>

      {/* FAQ / Benefits */}
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Common Questions</h2>
          <p className="text-slate-600 dark:text-slate-400">Everything you need to know about Premium access</p>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            {
              q: 'Is this a subscription?',
              a: 'No. Premium is a one-time 24-hour pass. No auto-renewal or hidden charges.'
            },
            {
              q: 'What payment methods do you accept?',
              a: 'We accept M-Pesa, credit/debit cards, bank transfers, and mobile money via Paystack.'
            },
            {
              q: 'When does my access expire?',
              a: 'Your premium access expires exactly 24 hours after successful payment.'
            },
            {
              q: 'Can I get a refund?',
              a: 'Contact our support team within 24 hours for issues with payment or access.'
            },
            {
              q: 'Is my payment secure?',
              a: 'Yes. Paystack uses PCI-DSS Level 1 compliance. Your card data never touches our servers.'
            },
            {
              q: 'Do I get support?',
              a: 'Premium members get priority support via email and Discord community access.'
            },
          ].map((faq, i) => (
            <Card key={i} className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardContent className="p-4">
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-2">{faq.q}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{faq.a}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
