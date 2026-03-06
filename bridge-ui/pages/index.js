// pages/index.js (Next.js concept)
import React, { useState } from 'react';

// Mock data to illustrate how the frontend would display the backend state
const mockWithdrawals = [
  { id: 'TX-1772784366610', user: '0xUserPublicAddress', amount: '15000', status: 'Approved', votes: '0/2' }, // ENS Error state
  { id: 'TX-1772784692896', user: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', amount: '15000', status: 'Approved', votes: '0/2' }, // Reverted state
  { id: 'TX-1772785000000', user: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', amount: '25000', status: 'Bridged', votes: '2/2', evmHash: '0xabc123456789...' },
];

export default function Dashboard() {
  const [balance, setBalance] = useState('485000'); // Mocked balance after funding/transfers

  // Define color palette and styles for status badges
  const statusStyles = {
    'Bridged': 'bg-green-600/20 text-green-400 border-green-500/30',
    'Approved': 'bg-yellow-600/20 text-yellow-400 border-yellow-500/30',
    'pending': 'bg-zinc-700/50 text-zinc-300 border-zinc-600',
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans p-6 md:p-10 space-y-8">
      <header className="border-b border-zinc-800 pb-6 mb-8">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl md:text-4xl font-bold text-zinc-50 flex items-center gap-3">
            CollebFed Dashboard: Hybrid Custody Bridge
          </h1>
          <span className="text-sm font-mono text-cyan-400 bg-cyan-950/40 px-3 py-1.5 rounded-full border border-cyan-800">
            WSL/Ubuntu System
          </span>
        </div>
      </header>

      {/* EVM Network Status Card */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl p-6 md:p-8 space-y-6">
        <h2 className="text-2xl font-bold text-zinc-100">EVM Network Status (Hardhat)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm font-medium">
          <div className="flex items-center justify-between gap-4 border-b border-zinc-800/60 pb-3">
            <span className="text-zinc-500">Managed Asset (ERC20Mock)</span>
            <span className="text-cyan-400 font-bold font-mono">0x5Fb...0aa3</span>
          </div>
          <div className="flex items-center justify-between gap-4 border-b border-zinc-800/60 pb-3">
            <span className="text-zinc-500">FedVault Contract</span>
            <span className="text-cyan-400 font-bold font-mono">0xe7f...3F0512</span>
          </div>
          <div className="flex items-center justify-between gap-4 border-b border-zinc-800/60 pb-3">
            <span className="text-zinc-500">Current Chain ID</span>
            <span className="text-zinc-100 font-bold">31337</span>
          </div>
          <div className="flex items-center justify-between gap-4 bg-green-950/20 border border-green-800/40 px-4 py-3 rounded-lg md:col-start-2">
            <span className="text-green-300 font-semibold">Total Vault Liquidity</span>
            <span className="text-3xl md:text-4xl font-extrabold text-green-100">{balance} FED</span>
          </div>
        </div>
      </section>

      {/* Requests Section */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-zinc-100">Withdrawal Requests (Private Governance Layer)</h2>
        <div className="space-y-6">
          {mockWithdrawals.map((tx) => (
            <div key={tx.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6 transition hover:border-zinc-700 hover:shadow-2xl">
              <div className="flex items-center justify-between gap-4 border-b border-zinc-800 pb-5">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-zinc-500 tracking-wider uppercase">Request ID</span>
                  <p className="text-xl font-mono font-bold text-zinc-100">{tx.id}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`px-4 py-1.5 rounded-full border text-sm font-semibold tracking-tight ${statusStyles[tx.status] || statusStyles['pending']}`}>
                    {tx.status}
                  </div>
                  <div className="text-xs font-mono text-zinc-500 bg-zinc-800 px-3 py-1 rounded">BFT Votes: {tx.votes}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4 text-sm font-medium">
                <div className="space-y-1">
                  <span className="text-zinc-500">Recipient (EVM Public Address)</span>
                  <p className="text-zinc-100 font-bold font-mono">{tx.user}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-zinc-500">Amount requested (FED)</span>
                  <p className="text-zinc-100 font-bold">{tx.amount} FED</p>
                </div>
                <div className="md:col-span-2 flex items-center gap-4 bg-zinc-950/30 border border-zinc-800 p-4 rounded-lg">
                  <div className="space-y-1 flex-1">
                    <span className="text-xs font-semibold text-zinc-600 tracking-wider uppercase">EVM Settlement Hash</span>
                    <p className="text-sm font-mono font-semibold text-zinc-400 truncate conceptual-tooltip">
                      {tx.evmHash || 'pending-consensus'}
                    </p>
                  </div>
                  {tx.evmHash && (
                    <button className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 group">
                      <span className="text-xs group-hover:text-cyan-400">📋 (conceptual) Copy</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}