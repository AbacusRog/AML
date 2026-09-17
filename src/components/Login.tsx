import { useState, FormEvent } from 'react';
import { supabase } from '../supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white border border-[#DAD5C9] rounded-sm p-8"
      >
        <p className="italic text-goldDeep text-sm mb-1" style={{ fontFamily: 'Georgia, serif' }}>
          Abacus Consultancy
        </p>
        <h1 className="text-2xl mb-6" style={{ fontFamily: 'Georgia, serif' }}>
          Sign in
        </h1>

        <label className="block text-xs text-[#3E4C63] mb-1">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 px-3 py-2 border border-[#DAD5C9] rounded-sm outline-none focus:border-gold"
        />

        <label className="block text-xs text-[#3E4C63] mb-1">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 px-3 py-2 border border-[#DAD5C9] rounded-sm outline-none focus:border-gold"
        />

        {error && <p className="text-sm text-red-700 mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-gold hover:bg-goldDeep text-white rounded-sm font-semibold disabled:opacity-60"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
