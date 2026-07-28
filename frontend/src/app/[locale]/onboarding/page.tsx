'use client';

import { useState } from 'react';
import { useRouter } from '@/navigation';
import { api } from '@/lib/api-client';

export default function OnboardingPage() {
  const router = useRouter();

  const [age, setAge] = useState('');
  const [occupation, setOccupation] = useState('');
  const [city, setCity] = useState('');
  const [familyMembers, setFamilyMembers] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [monthlyExpenseLimit, setMonthlyExpenseLimit] = useState('');
  const [financialGoal, setFinancialGoal] = useState('');
  const [riskLevel, setRiskLevel] = useState('medium');
  const [loading, setLoading] = useState(false);

  async function finish() {
    setLoading(true);

    try {
      await api.post('/users/complete-onboarding', {
        age: Number(age),
        occupation,
        city,
        family_members: Number(familyMembers),
        monthly_income: Number(monthlyIncome),
        monthly_expense_limit: Number(monthlyExpenseLimit),
        financial_goal: financialGoal,
        risk_level: riskLevel,
      });

      router.push('/dashboard');
    } catch (e) {
      console.error(e);
      alert('Unable to save your information.');
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#F8FCF9] flex items-center justify-center p-8">
      <div className="bg-white rounded-3xl shadow-xl p-10 w-full max-w-2xl">

        <h1 className="text-4xl font-bold mb-2">
          Welcome 
        </h1>

        <p className="text-gray-500 mb-8">
          Let's personalize your financial assistant.
        </p>

        <div className="space-y-5">

          <input
            className="input-field"
            placeholder="Age"
            value={age}
            onChange={(e) => setAge(e.target.value)}
          />

          <input
            className="input-field"
            placeholder="Occupation"
            value={occupation}
            onChange={(e) => setOccupation(e.target.value)}
          />

          <input
            className="input-field"
            placeholder="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />

          <input
            className="input-field"
            placeholder="Family members"
            value={familyMembers}
            onChange={(e) => setFamilyMembers(e.target.value)}
          />

          <input
            className="input-field"
            placeholder="Monthly income"
            value={monthlyIncome}
            onChange={(e) => setMonthlyIncome(e.target.value)}
          />

          <input
            className="input-field"
            placeholder="Monthly spending limit"
            value={monthlyExpenseLimit}
            onChange={(e) => setMonthlyExpenseLimit(e.target.value)}
          />

          <input
            className="input-field"
            placeholder="Financial goal"
            value={financialGoal}
            onChange={(e) => setFinancialGoal(e.target.value)}
          />

          <select
            className="input-field"
            value={riskLevel}
            onChange={(e) => setRiskLevel(e.target.value)}
          >
            <option value="low">Conservative</option>
            <option value="medium">Balanced</option>
            <option value="high">Aggressive</option>
          </select>

          <button
            onClick={finish}
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? 'Saving...' : 'Start Using IqtisodAI'}
          </button>

        </div>
      </div>
    </div>
  );
}
