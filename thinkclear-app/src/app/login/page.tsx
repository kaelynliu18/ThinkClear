'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Modal from './Modal';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const router = useRouter();

  const handleLogin = () => {
    if (username === 'tanujkart' && password === 'password') {
      router.push('/dashboard');
    } else {
      alert('Wrong username or password');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-blue-200 via-pink-100 to-pink-200 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-lg p-10 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-gray-300 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold text-white">
          ⭕
        </div>

        <h1 className="text-4xl font-extrabold text-blue-700 mb-1 tracking-wider">
          THI<span className="inline-block rotate-180 transform -mx-1">V</span>K{' '}
          <span className="text-blue-700 font-semibold">Clear</span>
        </h1>
        <p className="text-sm text-blue-600 mb-6 italic">For every face that matters.</p>

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full px-4 py-3 mb-3 border rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 mb-5 border rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          onClick={handleLogin}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition"
        >
          Log In
        </button>

        <div className="mt-5 flex justify-between text-sm text-blue-600 font-medium">
          <button onClick={() => setShowForgotModal(true)} className="hover:underline">
            Forgot password?
          </button>
          <button onClick={() => setShowSignUpModal(true)} className="hover:underline">
            Don’t have an account?
          </button>
        </div>
      </div>

      <Modal isOpen={showForgotModal} onClose={() => setShowForgotModal(false)}>
        <h2 className="text-xl font-bold mb-4 text-black">Reset your password</h2>
        <input
          type="email"
          placeholder="Enter your email"
          className="w-full px-4 py-2 mb-4 border rounded text-black"
        />
        <button className="w-full bg-blue-600 text-white py-2 rounded">Send Reset Link</button>
      </Modal>

      <Modal isOpen={showSignUpModal} onClose={() => setShowSignUpModal(false)}>
        <h2 className="text-xl font-bold mb-4 text-black">Create an Account</h2>
        <input
          type="text"
          placeholder="Name"
          className="w-full px-4 py-2 mb-3 border rounded text-black"
        />
        <input
          type="email"
          placeholder="Email"
          className="w-full px-4 py-2 mb-3 border rounded text-black"
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full px-4 py-2 mb-3 border rounded text-black"
        />
        <button className="w-full bg-blue-600 text-white py-2 rounded">Create Account</button>
      </Modal>
    </div>
  );
}
