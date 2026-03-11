import { useState } from 'react';
import { useRouter } from 'next/router';

export default function ResetPassword() {
    const router = useRouter();
    const { token, email } = router.query; // Ambil token dari URL

    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');

    const handleReset = async (e) => {
        e.preventDefault();
        setLoading(true);

        const res = await fetch('/api/auth/update-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, email, newPassword }),
        });

        if (res.ok) {
            setStatus('success');
            setTimeout(() => router.push('/'), 3000);
        } else {
            alert('Gagal meriset password. Token mungkin sudah tidak berlaku.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
            <div className="max-w-md w-full p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-lg">
                <h2 className="text-2xl font-bold mb-4 dark:text-white">Buat Password Baru</h2>
                {status === 'success' ? (
                    <div className="p-4 bg-emerald-100 text-emerald-700 rounded-lg">
                        Password berhasil diperbarui! Mengalihkan ke halaman login...
                    </div>
                ) : (
                    <form onSubmit={handleReset} className="space-y-4">
                        <input 
                            type="password" 
                            placeholder="Password Baru" 
                            required
                            className="w-full p-3 border rounded-lg dark:bg-slate-800 dark:text-white"
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <button disabled={loading} className="w-full py-3 bg-indigo-600 text-white rounded-lg">
                            {loading ? 'Memproses...' : 'Simpan Password'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}